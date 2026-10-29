export const MODES=Object.freeze({
 easy:{name:'Easy',funds:100000,expenses:0.65,growth:1.3,penalty:0.65,grant:20000,description:'Gentler running costs, faster growth, generous recovery.'},
 medium:{name:'Medium',funds:95000,expenses:1,growth:1,penalty:1,grant:15000,description:'A balanced city. Build carefully and keep services connected.'},
 hard:{name:'Hard',funds:90000,expenses:1.4,growth:0.75,penalty:1.4,grant:10000,description:'Higher upkeep and stronger shortage penalties. Every street counts.'},
 sandbox:{name:'Sandbox',funds:0,expenses:0,growth:1,penalty:0.7,grant:0,description:'Unlimited building funds. Creative play, never ranked.'}
});
export const BALANCE=Object.freeze({monthMs:10000,taxResident:90,taxJob:110,upgradeMultiplier:0.6,refund:0.25,maxLevel:3,grantCooldown:12,milestones:[50,150,400,1000,2500]});
