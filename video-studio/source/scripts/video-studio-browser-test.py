"""Exercise the built app with fictional provider responses, never real credits.
Requires Python Playwright, Chromium and ffmpeg; no provider key is used.
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = Path(os.environ.get('STUDIO_TEST_ARTIFACTS', '/tmp/video-studio-review'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
checks = 0

def check(value, message):
    global checks
    assert value, message
    checks += 1
    print('PASS ' + message, flush=True)

node = '''
import {createApp} from './server/dist/app.js';
import {initDb} from './server/dist/db/index.js';
initDb(':memory:');
const app=createApp();
const server=app.listen(0,'127.0.0.1',()=>console.log('TEST_PORT='+server.address().port));
'''
with tempfile.TemporaryDirectory(prefix='studio-browser-test-') as tmp:
    fixture = Path(tmp, 'fictional-test-clip.mp4')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'lavfi', '-i',
                    'testsrc2=size=320x180:rate=12', '-t', '1', '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(fixture)], check=True)
    video_bytes = fixture.read_bytes()
    server = subprocess.Popen(['node', '--input-type=module', '-e', node], cwd=ROOT,
        env={**os.environ, 'NODE_ENV': 'test', 'ENCRYPTION_KEY': '0' * 64,
             'CATALOG_SYNC_DISABLED': '1'},
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        while True:
            line = server.stdout.readline()
            if not line:
                raise RuntimeError('Test server did not start: ' + server.stderr.read())
            match = re.search(r'TEST_PORT=(\d+)', line)
            if match:
                base = 'http://127.0.0.1:' + match[1]
                break
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=shutil.which('chromium'))
            ctx = browser.new_context(viewport={'width': 1366, 'height': 1000})
            setup = ctx.request.post(base + '/api/auth/setup', data={
                'email': 'video-test@example.test', 'password': 'fictional-test-password'})
            assert setup.ok, setup.text()
            token = setup.json()['token']
            ctx.add_init_script('localStorage.setItem("freellmapi_dashboard_token", ' + json.dumps(token) + ')')
            pg = ctx.new_page()
            errors = []
            pg.on('pageerror', lambda error: errors.append(str(error)))
            pg.goto(base + '/video-studio')
            expect(pg.get_by_role('heading', name='Make your scene move.')).to_be_visible()
            expect(pg.get_by_text('Connect a video provider', exact=True)).to_be_visible()
            check(pg.get_by_role('button', name='Generate video', exact=True).is_disabled(),
                  'Real unconfigured backend cannot start a generation')
            pg.get_by_role('button', name='Workshop', exact=True).click()
            check('mechanic' in pg.locator('#video-scene').input_value(), 'Workshop starter fills a concrete scene')
            check('One continuous shot' in pg.get_by_text('Your production prompt').locator('..').locator('..').inner_text(),
                  'Prompt preview adds realistic camera and motion directions')
            response = ctx.request.get(base + '/')
            check("media-src 'self' blob:" in response.headers.get('content-security-policy', ''),
                  'Browser policy permits private MP4 blob previews')
            pg.screenshot(path=str(ARTIFACTS / 'video-studio-unconfigured-desktop.png'), full_page=True)

            catalog = {'models': [{'id': 123, 'modelId': 'fictional-video', 'name': 'Fictional test model',
                'platform': 'pollinations', 'enabled': True, 'hasKey': True,
                'quota': 'Fictional browser fixture — no real provider credits'}]}
            ctx.route('**/api/video-studio/models', lambda route: route.fulfill(json=catalog))
            pg.reload()
            expect(pg.locator('#video-model')).to_be_visible()
            pg.get_by_role('button', name='Nature', exact=True).click()
            pg.select_option('#video-aspect', '9:16')
            pg.select_option('#video-duration', '6')
            requests = []

            def success(route):
                requests.append(route.request.post_data_json)
                route.fulfill(content_type='video/mp4', body=video_bytes,
                              headers={'X-Provider': 'fictional', 'X-Model': 'fictional-video'})

            ctx.route('**/api/video-studio/generations', success)
            pg.get_by_role('button', name='Generate video', exact=True).click()
            expect(pg.locator('video')).to_be_visible()
            pg.wait_for_function('document.querySelector("video").readyState >= 1')
            check(len(requests) == 1 and requests[0]['aspectRatio'] == '9:16'
                  and requests[0]['duration'] == 6 and requests[0]['modelId'] == 123,
                  'Generation sends the selected scene, model, length and frame exactly once')
            check('apiKey' not in requests[0] and 'key' not in requests[0],
                  'Browser generation body contains no provider key')
            with pg.expect_download() as info:
                pg.get_by_role('link', name='Download MP4').click()
            download = info.value
            download.save_as(str(Path(tmp, 'downloaded.mp4')))
            check(Path(tmp, 'downloaded.mp4').read_bytes() == video_bytes,
                  'Download is the completed MP4 returned by the provider fixture')

            ctx.unroute('**/api/video-studio/generations')
            ctx.route('**/api/video-studio/generations', lambda route: route.fulfill(
                status=429, json={'error': {'message': 'Test quota exhausted; check provider credits.'}}))
            pg.get_by_role('button', name='Generate video', exact=True).click()
            expect(pg.get_by_role('alert')).to_contain_text('Test quota exhausted')
            check(pg.locator('video').count() == 0 and pg.get_by_role('link', name='Download MP4').count() == 0,
                  'A failed request never presents the previous video as a new success')
            check('stream' in pg.locator('#video-scene').input_value(), 'Provider failure preserves the scene')

            ctx.unroute('**/api/video-studio/generations')
            ctx.route('**/api/video-studio/generations', lambda route: route.fulfill(
                content_type='text/html', body='<html>Not a video</html>'))
            pg.get_by_role('button', name='Generate video', exact=True).click()
            expect(pg.get_by_role('alert')).to_contain_text('did not return an MP4')
            check(pg.locator('video').count() == 0, 'HTML responses are never offered as a video download')

            ctx.unroute('**/api/video-studio/generations')
            held_requests = []
            ctx.route('**/api/video-studio/generations', lambda route: held_requests.append(route))
            pg.get_by_role('button', name='Generate video', exact=True).click()
            expect(pg.get_by_role('button', name='Stop waiting')).to_be_visible()
            check(pg.locator('#video-scene').is_disabled(), 'Pending generation locks editable settings')
            pg.get_by_role('button', name='Stop waiting').click()
            expect(pg.get_by_role('alert')).to_contain_text('Stopped waiting')
            check(pg.locator('#video-scene').is_enabled(), 'Stopping restores the form without losing its scene')
            for route in held_requests:
                try:
                    route.abort()
                except Exception:
                    pass  # The browser may already have cancelled the request.
            ctx.unroute('**/api/video-studio/generations')

            for width in [320, 390, 768, 1024, 1366]:
                pg.set_viewport_size({'width': width, 'height': 900})
                check(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'),
                      f'No horizontal page overflow at {width}px')
            pg.set_viewport_size({'width': 390, 'height': 844})
            pg.screenshot(path=str(ARTIFACTS / 'video-studio-mobile.png'), full_page=True)
            check(not errors, 'No uncaught browser errors: ' + repr(errors))
            browser.close()
        print(f'{checks} video studio browser checks passed. Test clip is an ffmpeg fixture, not an AI generation.', flush=True)
    finally:
        server.terminate()
        server.wait(timeout=10)
