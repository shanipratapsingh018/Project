/* Public Supabase booking connection. Disabled until the owner completes setup. */
(function () {
  'use strict';
  var config=window.GW_BACKEND;
  if(!config||config.bookingEnabled!==true||!window.CMI_CONFIG)return;
  try {
    var url=new URL(config.url),key=config.publishableKey;
    if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/'||url.username||url.password||url.search||url.hash)return;
    if(typeof key!=='string'||key.startsWith('sb_secret_'))return;
    if(!key.startsWith('sb_publishable_')){
      var payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if(payload.role!=='anon')return;
    }
    window.CMI_CONFIG.business.bookingEndpoint=url.origin+'/functions/v1/submit-booking';
    window.CMI_CONFIG.business.bookingHeaders={apikey:key};
    window.CMI_CONFIG.business.bookingIdempotency=true;
  }catch(_){ /* Keep the working WhatsApp handoff when setup is incomplete. */ }
}());
