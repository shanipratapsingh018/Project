/* Owner-supplied Google review screenshots.
   The owner confirmed that The Car Junction is the same garage branded here as
   CarMechanic Indore, and requested these excerpts on the website.
   No live Google API or independently verified review URL was supplied.
   Relative screenshot dates are intentionally not converted to invented dates.
   consent means explicit customer permission; ownerApprovedScreenshot records
   the owner's publication request for an existing public review instead.
*/
(function(root){
 const REVIEWS={
  showSamples:false,
  googleReviewUrl:null,
  snapshot:{rating:4.8,count:34,businessName:'The Car Junction',source:'Owner-provided Google review screenshot'},
  items:[
   {name:'Harshita Sharma',rating:5,service:'A/C installation and repair, Auto glass repair, Body repairs, Wheel alignment',vehicle:null,date:null,
    text:'The car junction is great! Very thorough in their work. Very considerate of your time schedule. They provide excellent service. They’re honest, reliable, responsive, and the staff is great.This is the best place to get your car serviced. Definitely recommend The car junction.',
    source:'Google · The Car Junction',isSample:false,approved:true,consent:false,ownerApprovedScreenshot:true},
   {name:'Taher M. Alot',rating:5,service:null,vehicle:null,date:null,
    text:'Nice and high equipment workshop. Nice servicing as well. Serve through Go Mechanic Qpp as well. Car Alignment and Other higly Equipped service. Free pickup all over Indore city is the best thing I got.',
    source:'Google · The Car Junction',isSample:false,approved:true,consent:false,ownerApprovedScreenshot:true}
  ]
 };
 if(typeof module!=='undefined'&&module.exports)module.exports=REVIEWS;
 else root.CMI_REVIEWS=REVIEWS;
})(typeof window!=='undefined'?window:this);
