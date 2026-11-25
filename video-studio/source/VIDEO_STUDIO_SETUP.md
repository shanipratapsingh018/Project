# Realistic Video Studio

This installation extends FreeLLMAPI revision `7c9a38050814585958f690a96e13f5500459b0a7`
with a private web interface at `/video-studio`. The studio is the default landing
page after sign-in. Source is MIT-licensed, like the upstream project.

## Start on your computer

**Windows:** extract the ZIP and double-click `START_VIDEO_STUDIO.cmd`.
If Node.js is missing, the launcher opens an official Node.js 24 installer
download. Install it and reopen the launcher. The first start installs the
locked dependencies, builds the app and opens your browser only after the
server is ready. Keep its terminal window open. See `START_HERE_WINDOWS.txt`
for the same steps in Hindi. No Cloud environment settings are needed for this
local installation. Existing `.env` and database files are preserved.

**Terminal / other systems:**

Install Node.js 22 or 24, then run from this folder:

```sh
npm ci
npm run build
npm run studio
```

Open `http://localhost:3000/video-studio` on the same computer. First create your
own dashboard account. The launcher generates a private `.env` encryption key
only when that file does not already exist. Keep `.env` and `server/data/` private;
never add them to source control. If `.env` already specifies a different port,
use the address printed by the server. The default binding is local to your computer.

## Connect real video generation

1. Allow the signed catalog to sync from `https://api.freellmapi.co`. No model
   catalog, free quota or credentials are fabricated by this implementation.
2. Open **Keys**, choose a supported video provider and add your own key there.
   Current adapters include Pollinations, Hugging Face, NovAI and Varosity.
   The provider must grant video-generation access and have usable credits/quota.
   Text-model access alone does not enable video. Check its current price and terms.
3. In **Models → Video**, enable a supported model. Return to Video Studio and
   select **Refresh models**. Configured credentials do not guarantee remaining quota.
4. Pick a starter or describe one visible scene, choose camera/lighting, and start
   with **Model default** length/frame. Press **Generate video** once. The completed
   MP4 appears in the preview and can be downloaded.

Use one short action per clip. Natural daylight, steady camera motion and
physically plausible details usually make a stronger starting prompt. Hindi and
English scene text can be entered; model language support varies. No output
quality or free usage level is guaranteed by this gateway.

## Honest job states

- A model without configured credentials cannot be submitted from the studio.
- Provider keys remain encrypted on the server. The browser authenticates with
  its existing dashboard session; it receives no provider key or unified API key.
- Only a completed MP4 becomes a playable/downloadable result. No sample is
  shown as a real generation. Starting another request removes the previous result.
- No automatic retry is started by this page. FreeLLMAPI's underlying media
  adapter retains its existing provider behavior; inspect Logs after uncertain receipt.
- The studio bounds a request to five minutes. **Stop waiting** disconnects it
  and aborts further gateway work. The upstream provider may still complete its
  job or charge quota; check its job history before retrying.
- Prompts and output are held in this page's memory. Download a result before
  reloading or leaving. The existing gateway request analytics remain server-side.

## Cloud review

The implementation is installed under `/workspace/freellmapi`. A Cloud HTTP
preview must be configured for port **3000** before a hosted preview link exists.
For that preview, run with `HOST=0.0.0.0 npm run studio`. First-run account setup
from a remote browser requires the one-time code printed in the server console.
Do not expose the single-user gateway as an unauthenticated public service.

This task environment currently has no configured provider secrets or HTTP
preview. Its network policy permits package/GitHub hosts, not the catalog or
video providers. Real inference needs the selected provider and catalog hosts
allowed through the environment settings, plus provider credentials entered
securely. Those are deployment configuration requirements, separate from the code.

## Verification

```sh
npm run build
npm run test -w server -- src/__tests__/routes/video-studio.test.ts
npm exec -w client -- vitest run src/lib/video-studio.test.ts
python3 scripts/video-studio-browser-test.py
```

The browser check needs Chromium, Playwright and ffmpeg. It tests against an
isolated in-memory database, fictional provider responses and a generated test
pattern MP4. It never spends real provider credits or presents a test clip as AI
output. A live, realistic video render remains unverified until a real video
provider is configured.

## Hindi quick guide

`npm run studio` chalakar browser mein `http://localhost:3000/video-studio` kholein.
Apna account banayein, **Keys** mein provider key daalein, video model enable karein,
phir scene likhkar **Generate video** dabayein. Provider ki video access aur quota
zaroori hai. API key chat mein na bhejein; use app ke private Keys page par daalein.

## Desktop launcher verification

The install/build/start flow and automatic browser-opening order were tested
on Linux, using a fake browser opener and an isolated temporary database. The
Windows CMD entry point was reviewed, but this environment has no Windows
runner. The official Node.js 24.22.3 x64 installer URL was verified. Existing
local settings and database files are preserved by the launcher.
