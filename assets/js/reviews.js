/* Car Repair Wala customer reviews only.
   No genuine Car Repair Wala reviews have been supplied yet. The previously supplied
   screenshots were identified as belonging to another business and removed.
   Add feedback only after confirming it is from a Car Repair Wala customer and that
   the customer permits publication: isSample:false, approved:true, consent:true.
   The profile button follows business.googleBusinessProfileUrl in config.js;
   googleProfileUrl is an optional override. googleReviewUrl requires
   an actual Car Repair Wala Ask for reviews link; do not invent a Place ID.
*/
(function(root){
 const REVIEWS={showSamples:false,googleReviewUrl:null,googleProfileUrl:null,snapshot:null,items:[]};
 if(typeof module!=='undefined'&&module.exports)module.exports=REVIEWS;
 else root.CMI_REVIEWS=REVIEWS;
})(typeof window!=='undefined'?window:this);
