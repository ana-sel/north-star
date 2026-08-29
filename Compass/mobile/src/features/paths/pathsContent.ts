/**
 * Compass v1 · paths content (bundled read-only).
 *
 * Source of truth: docs/design/wireframes/shared/paths-data.js.
 * Structural copy — do not hand-edit; mirror upstream changes.
 *
 * User engagement (returns, camp progress, seeded/integrated status)
 * lives in the path_progress and path_returns tables, not here.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */

export interface DomainInfo { icon: string; colour: string; q: string; }
export interface PathVoice { tight: string; open: string; }
export interface PathPractice { what: string; freq: string; do: string; counts: string; }
export interface PathCamp {
  dur: string;
  state: 'done' | 'active' | 'locked';
  effort: string;
  layers: Array<{ s: string; r: string }>;
}
export interface PathCard {
  campNow: number; campTotal: number;
  reps: number; repsTotal: number; daysSince: number;
  returnsTotal: number; weeks: number; campsClosed: number;
  news: { returns: number; campClosed: boolean };
  effect: string; evidence: string; reflection: string;
  returns: number[];
}
export interface PathQuality {
  domain: string;
  quality: string;
  shows: string;
  situations?: string[];
  identity: string;
  innerWork: string;
  values: string[];
  active: boolean;
  bg: string;
  ritual: { v: string } | null;
  practice: PathPractice;
  voice: PathVoice;
  span: string;
  card?: PathCard;
  camps: PathCamp[];
  cta: string;
  sec?: string;
  tryPool?: { note: string; cats: Record<string, string[]> };
}

/* Shared source of truth for path data. Loaded by plan-trails.html, path-detail.html, today.html. */

/* ── Domains ───────────────────────────────────────────────────
   Four arenas, defined by WHERE the quality is exercised, so they
   don't overlap. Colour belongs to the domain, not the quality —
   the palette teaches the taxonomy. Every domain always gets a
   chip; an empty one explains itself rather than disappearing. */
export const DOMAINS: Record<string, DomainInfo> = {
  Inward:   {icon:'ic-moon',    colour:'#9b8fd6', q:'How you meet yourself'},
  Together: {icon:'ic-users',   colour:'#cf8f94', q:'How you meet other people'},
  Craft:    {icon:'ic-pen',     colour:'#d3aa62', q:'How you meet the work'},
  Frontier: {icon:'ic-compass', colour:'#7fa8b8', q:'How you meet what is new'},
};

/* ── The three camps ───────────────────────────────────────────
   Every path has the same shape, so the stages are named once and
   shared. Thirteen invented camp names ('First Contact', 'Deepening',
   'Venturing'…) were thirteen proper nouns to learn that carried no
   information the position didn't already give. */
export const STAGES: readonly string[] = ['Watching','Doing','Under pressure'];

/* ── Path model ────────────────────────────────────────────────
   A path grows exactly ONE quality, so it carries no separate name.
   A practice must be executable: the container (what/freq), the
   attentional move (do), and an outcome the user controls (counts).
   The voice pair is part of the practice, not a separate idea.
   ─────────────────────────────────────────────────────────── */
export const DATA: Record<string, PathQuality> = {
  stillness:{
    domain:'Inward', quality:'Stillness',
    shows:'You pause before you react, instead of after.',
    situations:[
      'You catch the sharp reply before it leaves your mouth.',
      'You put the phone face-down instead of firing back.',
      'You sit through a hard meeting without needing to fix it.',
    ],
    identity:'"I am becoming someone who can rest without earning it."',
    innerWork:'Where do I rush, and what am I avoiding by rushing?',
    values:['Peace','Presence'], active:true,
    bg:'linear-gradient(155deg,#3a3850,#23202b)',
    ritual:{v:'1 min silence on waking'},
    practice:{
      what:'Sit for 5 minutes, before your first screen',
      freq:'2\u20134\u00d7 / week',
      do:'Sit down and let your attention rest on your breath. You will drift into planning the day \u2014 everyone does. Each time you catch it, say the sentence to yourself and come back to the breath. <b>The catching-and-returning is the practice.</b> Not the sitting.',
      counts:'You came back <b>once</b>. Not when your mind goes quiet \u2014 it won\u2019t, and that was never the goal.',
    },
    voice:{
      tight:'\u201cI don\u2019t have time for this. I should be getting on with something.\u201d',
      open:'\u201cThis is the thing I\u2019m doing. It can take as long as it takes.\u201d',
    },
    span:'about 6 weeks',
    card:{
      campNow:2, campTotal:3,
      reps:5, repsTotal:9, daysSince:1,
      returnsTotal:27, weeks:4, campsClosed:1,
      news:{returns:2, campClosed:false},
      effect:'Your evenings often read steadier on the days you sat. Compass noticed it \u2014 only you can say if it\u2019s true.',
      evidence:'Your evenings often read steadier on the days you sat.',
      reflection:'\u201cI notice when I rush. I don\u2019t always stop it yet \u2014 but I see it.\u201d',
      returns:[0,2,3,5,6,8,9,11,12],
    },
    camps:[
      {dur:'7 days \u00b7 complete',state:'done',effort:'2 min',
        layers:[{s:'You only watched:',r:' three moments of rushing, without fixing them'},{s:'No practice yet:',r:' noticing was the whole work'}]},
      {dur:'in progress',state:'active',effort:'5 min \u00b7 2\u20134\u00d7/wk',
        layers:[{s:'The practice starts:',r:' the 5-minute sit'},{s:'Inner work:',r:' where did I rush this week, and why?'}]},
      {dur:'ahead',state:'locked',effort:'10 min \u00b7 2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' can you stay still when something actually goes wrong?'},{s:'Closes when:',r:' you say it feels like yours \u2014 never awarded automatically'}]},
    ],
    cta:'See it on Today',
  },
  craft:{
    domain:'Craft', quality:'Craftsmanship',
    shows:'You finish things properly, even when nobody checks.',
    situations:[
      'You do the last ten percent instead of moving on.',
      'You reread the email once and change the one line that mattered.',
      'You go back for the small fix rather than telling yourself it\u2019s fine.',
    ],
    identity:'"I am becoming someone who takes their own work seriously."',
    innerWork:'Where do I settle for half-done, and what am I telling myself?',
    values:['Excellence','Discipline'], active:true,
    bg:'linear-gradient(145deg,#3a3420,#241f12)',
    ritual:null,
    practice:{
      what:'Take one small thing all the way to done',
      freq:'15 min \u00b7 2\u20134\u00d7 / week',
      do:'Pick something small enough to finish: one drawer, one email, one function. Work it to the actual end \u2014 the last screw, the last line. When the pull to call it good enough arrives, say the sentence and do the final tenth anyway.',
      counts:'You did the <b>last tenth once</b>. Not when the result is good \u2014 that isn\u2019t yours to control.',
    },
    voice:{
      tight:'\u201cI\u2019m hopeless at this. Who on earth wrote these instructions?\u201d',
      open:'\u201cHuh \u2014 interesting how that part fits. I\u2019ll find a way.\u201d',
    },
    span:'about 8 weeks',
    card:{
      campNow:2, campTotal:3,
      reps:6, repsTotal:10, daysSince:3,
      returnsTotal:6, weeks:2, campsClosed:1,
      news:{returns:0, campClosed:false},
      effect:'Work you finish with care seems to leave you less drained than work you rush. Early days \u2014 keep watching.',
      evidence:'Work you finish with care seems to leave you less drained than work you rush.',
      reflection:'\u201cI can see the exact moment I want to stop. I don\u2019t always keep going \u2014 but I see it.\u201d',
      returns:[1,3,4,7,9,10],
    },
    camps:[
      {dur:'10 days \u00b7 complete',state:'done',effort:'1 min',
        layers:[{s:'You only watched:',r:' where you call something done that isn\u2019t'},{s:'No practice yet:',r:' seeing the pattern was the whole work'}]},
      {dur:'in progress',state:'active',effort:'15 min \u00b7 2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one small thing, taken all the way to done'},{s:'Inner work:',r:' catch the pull to call it good enough'}]},
      {dur:'ahead',state:'locked',effort:'20 min \u00b7 2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' do it properly when you\u2019re tired and nobody would ever know'},{s:'Closes when:',r:' you say it feels like yours'}]},
    ],
    cta:'See it on Today',
  },
  presence:{
    domain:'Inward', quality:'Presence',
    shows:'You stay in the room, instead of half-elsewhere.',
    identity:'"I am becoming someone who is actually here for their own life."',
    innerWork:'Where do I leave the moment, and what pulls me out?',
    values:['Presence','Connection'], active:false,
    bg:'linear-gradient(155deg,#33384a,#20242f)',
    ritual:{v:'3 conscious breaths before entering a room'},
    practice:{
      what:'Give one block of time a single task',
      freq:'20 min \u00b7 2\u20134\u00d7 / week',
      do:'Choose one block and one task. Put the second screen face-down and out of reach. Your attention will leave for the next thing \u2014 when you notice, say the sentence and put it back on what is actually in front of you.',
      counts:'You noticed you had left, and came back. Not when you never leave.',
    },
    voice:{
      tight:'\u201cLet me get through this so I can get to the real thing.\u201d',
      open:'\u201cThis is the real thing. I\u2019m here for it.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' the moments you go half-absent'}]},
      {dur:'14 days',state:'locked',effort:'20 min \u00b7 2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' single-task one block'}]},
      {dur:'14 days',state:'locked',effort:'20 min \u00b7 2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay fully present in a hard conversation'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  authority:{
    domain:'Together', quality:'Quiet authority',
    shows:'You say it once, calmly, and don\u2019t over-explain.',
    identity:'"I am becoming someone who doesn\u2019t need to be agreed with to feel steady."',
    innerWork:'Where do I over-explain to be liked?',
    values:['Self-respect','Composure'], active:false,
    bg:'linear-gradient(155deg,#3d3038,#241c22)',
    ritual:null,
    practice:{
      what:'Say one thing you mean \u2014 once, then stop',
      freq:'2\u20134\u00d7 / week',
      do:'Pick a moment where you\u2019d normally soften or repeat yourself. Say the thing at about half your usual speed. Then stop talking. When the urge to add a reason arrives, say the sentence and let the silence sit there instead.',
      counts:'You <b>stopped after saying it once</b>. Not when they agree \u2014 that isn\u2019t the practice.',
    },
    voice:{
      tight:'\u201cThey think I\u2019m being difficult. Let me explain it again.\u201d',
      open:'\u201cI\u2019ve said it. They can sit with it.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' when you rush or over-justify'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one calm, unhurried statement'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay steady in a moment of conflict'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  warmth:{
    domain:'Together', quality:'Warmth',
    shows:'People relax around you, and notice that you noticed them.',
    situations:[
      'You say the specific thing you noticed instead of “nice one”.',
      'You stay with someone\u2019s answer instead of moving to your next question.',
      'You send the message you\u2019d normally rewrite six times.',
    ],
    identity:'"I am becoming someone people feel safe being themselves around."',
    innerWork:'What makes me withhold warmth?',
    values:['Kindness','Connection'], active:true,
    bg:'linear-gradient(145deg,#4a3630,#2c1f1c)',
    card:{
      campNow:1, campTotal:3,
      reps:2, repsTotal:6, daysSince:1,
      returnsTotal:2, weeks:1, campsClosed:0,
      news:{returns:1, campClosed:false},
      effect:'Too early to see anything yet. Compass will tell you when there is something to look at.',
      evidence:'Too early to say what it has changed.',
      reflection:'\u201cI keep noticing the thing I could have said.\u201d',
      returns:[9,12],
    },
    ritual:{v:'One genuine, specific kindness'},
    practice:{
      what:'Say the kind thing you\u2019d normally leave in your head',
      freq:'2\u20134\u00d7 / week',
      do:'Pick one person. Name the specific thing you actually noticed \u2014 not \u201cwell done\u201d but the detail. Say it out loud. When it starts to feel exposing, say the sentence and say it anyway.',
      counts:'You <b>said it out loud</b>. Not when they respond well \u2014 their reaction is theirs.',
    },
    voice:{
      tight:'\u201cIf I say something kind it\u2019ll land awkwardly and they won\u2019t care.\u201d',
      open:'\u201cI\u2019ll say the kind thing. What they do with it is theirs.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:" moments you could soften and don't"}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' name one small detail about someone, out loud'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay warm with someone difficult'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  curiosity:{
    domain:'Frontier', quality:'Curiosity',
    shows:'You move toward the thing you don\u2019t understand.',
    identity:'"I am becoming someone whose world keeps getting larger."',
    innerWork:'What keeps me small and safe?',
    values:['Curiosity','Adventure'], active:false,
    bg:'linear-gradient(145deg,#2e3a44,#1a242c)',
    ritual:null,
    practice:{
      what:'Follow one thing you don\u2019t understand, before looking up the answer',
      freq:'weekly',
      do:'Pick something genuinely unfamiliar \u2014 a route, a dish, a subject, someone else\u2019s world. Go into it and stay in the not-knowing a little longer than is comfortable before you reach for the explanation.',
      counts:'You <b>started before you felt ready</b>. Not when it goes well.',
    },
    tryPool:{
      note:'You don\u2019t have to invent one. Anything here you haven\u2019t done will do \u2014 the point is the not-knowing, not the activity.',
      cats:{
        'Hobbies':['A pottery or ceramics evening','Photography \u2014 one afternoon, one lens','Learn three chords on something','Cook a cuisine you\u2019ve never cooked','Fix or build something with your hands'],
        'Body':['A climbing wall','A long hike on your own','Swimming outdoors','A martial arts or boxing class','Social dancing \u2014 the kind with strangers'],
        'Music':['A genre you\u2019re sure you dislike','A live gig by someone you\u2019ve never heard of','One album start to finish, phone in another room'],
        'Reading':['An author from a country you\u2019ve never read','Poetry, out loud, alone','A subject you were bad at in school'],
        'Places':['A film alone in a cinema','A museum you\u2019ve walked past for years','A town two hours away, no reason','Three hours somewhere with no plan'],
      },
    },
    voice:{
      tight:'\u201cI\u2019d only embarrass myself. I\u2019ll stick to what I know.\u201d',
      open:'\u201cI have no idea how this goes. Let\u2019s find out.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'weekly',
        layers:[{s:'You only watch:',r:' where you route around the unfamiliar'}]},
      {dur:'21 days',state:'locked',effort:'weekly',
        layers:[{s:'The practice:',r:' go into one thing you don\u2019t understand'}]},
      {dur:'14 days',state:'locked',effort:'weekly',
        layers:[{s:'The test:',r:' start something in front of people who might watch you fail'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  selfpossession:{
    domain:'Inward', quality:'Self-possession',
    shows:'You stay recognisably yourself around someone you want to impress.',
    identity:'"I am becoming someone who doesn\u2019t rearrange himself to be chosen."',
    innerWork:'Who do I become around the people I most want to like me?',
    values:['Self-respect','Honesty'], active:false,
    bg:'linear-gradient(155deg,#3c3550,#241f2e)',
    ritual:null,
    practice:{
      what:'Say one thing you actually think, in company that intimidates you',
      freq:'2\u20134\u00d7 / week',
      do:'Pick a conversation where you\u2019d normally agree, soften, or go quiet. Offer your actual opinion \u2014 plainly, with no preamble apologising for it. Then let it stand without adding reasons.',
      counts:'You <b>said the thing you actually thought</b>. Not when they agree, and not when it lands well.',
    },
    voice:{
      tight:'\u201cCareful. What do they want me to be here?\u201d',
      open:'\u201cThey\u2019re meeting me. That was the whole point of coming.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' the moment you edit yourself to fit the room'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one unedited opinion, said plainly'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay yourself in front of someone whose opinion you badly want'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  solitude:{
    domain:'Inward', quality:'Solitude',
    shows:'You can be alone in a room without reaching for your phone.',
    identity:'"I am becoming someone whose own company is enough."',
    innerWork:'What am I avoiding in the three seconds before I pick up my phone?',
    values:['Independence','Peace'], active:false,
    bg:'linear-gradient(155deg,#343048,#1f1c29)',
    ritual:null,
    practice:{
      what:'Half an hour alone, with the phone in another room',
      freq:'2\u20134\u00d7 / week',
      do:'Put the phone somewhere else and stay put for thirty minutes. Read, cook, sit, walk. The reaching feeling will arrive on schedule \u2014 when it does, say the sentence and stay where you are.',
      counts:'You <b>stayed through one wave of wanting to reach</b>. Not when the half hour feels good.',
    },
    voice:{
      tight:'\u201cThis is dead time. Who could I message?\u201d',
      open:'\u201cThere\u2019s nothing to fill. This is just the evening.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' what happens in you just before you reach'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' half an hour with the phone in another room'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' an evening alone on a day you badly want company'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  nonattachment:{
    domain:'Inward', quality:'Non-attachment',
    shows:'You want things fully, and don\u2019t require them to happen.',
    identity:'"I am becoming someone who can love without needing reality to obey."',
    innerWork:'What am I holding so tightly that I can\u2019t see it clearly?',
    values:['Freedom','Acceptance'], active:false,
    bg:'linear-gradient(160deg,#3e3a55,#232030)',
    ritual:null,
    practice:{
      what:'Name one outcome you\u2019re gripping, and one thing you\u2019d still have without it',
      freq:'2\u20134\u00d7 / week',
      do:'Pick something you\u2019re waiting on \u2014 a reply, a result, a person. Write the wanting down honestly, without arguing yourself out of it. Then write one true sentence about the life you would still have if it never arrives.',
      counts:'You <b>wrote both sentences</b>. Not when the wanting stops \u2014 it doesn\u2019t have to.',
    },
    voice:{
      tight:'\u201cIf this doesn\u2019t happen the way I need it to, I don\u2019t know what I\u2019ll do.\u201d',
      open:'\u201cI want this. I\u2019m not owed it. Both are true at once.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' which outcomes you\u2019ve quietly made non-negotiable'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the wanting, written down beside what remains without it'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' hold steady through a real disappointment'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  embodied:{
    domain:'Inward', quality:'Embodied awareness',
    shows:'You notice what your body is doing before your mind explains it.',
    identity:'"I am becoming someone who lives in his body, not just above it."',
    innerWork:'Where do I feel it first, and what do I call it too quickly?',
    values:['Health','Awareness'], active:false,
    bg:'linear-gradient(150deg,#38364c,#211f2c)',
    ritual:{v:'One slow breath before standing up'},
    practice:{
      what:'Three thirty-second body checks at ordinary moments',
      freq:'2\u20134\u00d7 / week',
      do:'Three times in the day, stop wherever you are and check three things: jaw, shoulders, breath. Don\u2019t fix them. Just find out what they were doing while you weren\u2019t looking.',
      counts:'You <b>checked once and named what you found</b>. Not when the tension goes.',
    },
    voice:{
      tight:'\u201cI\u2019m fine. It\u2019s just been a busy day.\u201d',
      open:'\u201cJaw tight, breath high. Something is going on, and I don\u2019t know what yet.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' where your body holds things before you notice'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' three body checks, no fixing'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' notice it mid-argument, while it\u2019s happening'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  reciprocity:{
    domain:'Together', quality:'Reciprocity',
    shows:'You notice whether it flows both ways \u2014 and you act on what you notice.',
    identity:'"I am becoming someone who gives generously and stops when it\u2019s one-sided."',
    innerWork:'Where am I paying for a place at someone\u2019s table?',
    values:['Self-respect','Connection'], active:false,
    bg:'linear-gradient(150deg,#48343a,#291d22)',
    ritual:null,
    practice:{
      what:'Offer once \u2014 then wait, without topping it up',
      freq:'2\u20134\u00d7 / week',
      do:'Make one genuine offer: time, help, interest, warmth. Then stop. Don\u2019t follow it with a second offer to cover the silence. Watch what comes back over the next few days, and let that be information rather than a verdict on you.',
      counts:'You <b>made one offer and didn\u2019t top it up</b>. Not when they reciprocate.',
    },
    voice:{
      tight:'\u201cIf I just give a bit more, they\u2019ll come toward me.\u201d',
      open:'\u201cI\u2019ve offered. What comes back is information, not a rejection.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' which relationships you are carrying alone'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' offer once, then let the silence stand'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stop giving to someone you very much want to keep'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  repair:{
    domain:'Together', quality:'Repair',
    shows:'You go back after the argument \u2014 and the thing actually changes.',
    identity:'"I am becoming someone conflict doesn\u2019t quietly end things with."',
    innerWork:'What do I do instead of going back \u2014 go quiet, go busy, or go cold?',
    values:['Integrity','Connection'], active:false,
    bg:'linear-gradient(150deg,#453036,#28191e)',
    ritual:null,
    practice:{
      what:'Go back to one thing you left unresolved',
      freq:'2\u20134\u00d7 / week',
      do:'Pick something small you let slide \u2014 a snapped remark, a missed call, a flat reply. Go back to it. Name your part specifically, with no \u201cbut\u201d after it. Then say what you\u2019ll do differently, and do that thing.',
      counts:'You <b>named your part without a \u201cbut\u201d</b>. Not when they apologise back.',
    },
    voice:{
      tight:'\u201cLeave it. Bringing it up will only start it again.\u201d',
      open:'\u201cWhat\u2019s between us matters more than being right about it.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' what you do instead of going back'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one specific repair, no \u201cbut\u201d'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' go first, when you believe you were the wronged one'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  sharing:{
    domain:'Together', quality:'Sharing the light',
    shows:'People leave a conversation with you feeling more capable than they arrived.',
    identity:'"I am becoming someone whose success makes room for other people."',
    innerWork:'When someone else does well, what happens in me first?',
    values:['Generosity','Leadership'], active:false,
    bg:'linear-gradient(150deg,#4c3a35,#2b1f1d)',
    ritual:null,
    practice:{
      what:'Give away one thing you\u2019d normally keep',
      freq:'2\u20134\u00d7 / week',
      do:'Pick something you hold: a contact, a method, a piece of credit, a thing you know. Give it to someone who could use it \u2014 without making it a favour they now owe you.',
      counts:'You <b>handed it over without keeping the receipt</b>. Not when they thank you.',
    },
    voice:{
      tight:'\u201cIf I hand this over, what\u2019s left that\u2019s mine?\u201d',
      open:'\u201cThere\u2019s more of this than I can use. Pass it on.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' your first reaction when someone else does well'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' give one thing away, no receipt kept'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' make room for someone who might outgrow you'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  followthrough:{
    domain:'Craft', quality:'Follow-through',
    shows:'You finish what you started, especially after the excitement wears off.',
    identity:'"I am becoming someone whose word to himself means something."',
    innerWork:'What does the story sound like on the day I quit?',
    values:['Integrity','Discipline'], active:false,
    bg:'linear-gradient(145deg,#3d3623,#251f14)',
    ritual:null,
    practice:{
      what:'Return to the one thing that has gone boring',
      freq:'2\u20134\u00d7 / week',
      do:'Choose the project you\u2019re most tempted to abandon. Give it one honest session \u2014 not a heroic one. The point isn\u2019t progress today, it\u2019s proving to yourself that interest isn\u2019t the thing that decides.',
      counts:'You <b>showed up to the boring one</b>. Not when it becomes interesting again.',
    },
    voice:{
      tight:'\u201cThis isn\u2019t working. Something else would be a better use of my time.\u201d',
      open:'\u201cThe dull middle is the job. This is what it feels like from the inside.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' the story you tell yourself right before you switch'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one honest session on the boring thing'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' finish something after the excitement has completely gone'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  longview:{
    domain:'Craft', quality:'Long-view',
    shows:'You choose the thing that pays in five years over the thing that pays today.',
    identity:'"I am becoming someone who is patient with things that compound."',
    innerWork:'What am I trading my future for, and is it a fair trade?',
    values:['Freedom','Patience'], active:false,
    bg:'linear-gradient(150deg,#38321f,#221d11)',
    ritual:{v:'Move something to savings before anything else'},
    practice:{
      what:'Take one action whose payoff is at least a year away',
      freq:'2\u20134\u00d7 / week',
      do:'Do one thing today that will only matter later \u2014 the transfer, the study hour, the boring maintenance. Then don\u2019t check whether it\u2019s working. Checking is the enemy of compounding.',
      counts:'You <b>did the slow thing</b>. Not when the number moves.',
    },
    voice:{
      tight:'\u201cThat\u2019s too slow. I need something that moves now.\u201d',
      open:'\u201cSmall and dull, repeated, beats clever and fast. Boring is the strategy.\u201d',
    },
    span:'about 10 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' where you trade the next decade for this week'}]},
      {dur:'28 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one action that only pays later, unchecked'}]},
      {dur:'28 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' hold the slow plan through a month where nothing visibly moves'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  agency:{
    domain:'Craft', quality:'Agency',
    shows:'You look for the move you can make, instead of the reason you can\u2019t.',
    identity:'"I am becoming someone who acts on his own life instead of waiting on it."',
    innerWork:'Where am I waiting for permission that isn\u2019t coming?',
    values:['Freedom','Courage'], active:false,
    bg:'linear-gradient(145deg,#403823,#262013)',
    ritual:null,
    practice:{
      what:'Find the one move that is genuinely yours, and make it today',
      freq:'2\u20134\u00d7 / week',
      do:'Take a situation you feel stuck in. Write down the part that honestly isn\u2019t yours to control, and set it aside. Then find one small action inside the part that is, and do it before the day ends.',
      counts:'You <b>made one move that was yours</b>. Not when the situation changes.',
    },
    voice:{
      tight:'\u201cThere\u2019s nothing I can do until they decide.\u201d',
      open:'\u201cWhat\u2019s the smallest move that\u2019s actually mine to make?\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' where you are waiting rather than choosing'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one move that is yours, made same-day'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' act inside a situation you genuinely cannot control'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  stewardship:{
    domain:'Craft', quality:'Stewardship',
    shows:'You treat money as a tool for freedom, not a scoreboard.',
    identity:'"I am becoming someone who knows what enough looks like."',
    innerWork:'What am I actually buying when I buy this?',
    values:['Freedom','Clarity'], active:false,
    bg:'linear-gradient(150deg,#363020,#201c12)',
    ritual:null,
    practice:{
      what:'Price one purchase in freedom, not money',
      freq:'2\u20134\u00d7 / week',
      do:'Before one non-essential spend, work out roughly what it costs in future autonomy \u2014 hours of work, days of runway. Then decide. Sometimes the answer is yes, and that\u2019s fine. The practice is deciding on purpose, not abstaining.',
      counts:'You <b>did the sum before you decided</b>. Not when you say no.',
    },
    voice:{
      tight:'\u201cI\u2019ve earned this. And it\u2019s not that much, really.\u201d',
      open:'\u201cWhat does this cost me in freedom? Is that a fair trade?\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' what you are buying underneath the thing you are buying'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one purchase priced in hours of your life'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' decide well on something you very much want'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  discipline:{
    domain:'Craft', quality:'Physical discipline',
    shows:'You train on the days you don\u2019t feel like it.',
    identity:'"I am becoming someone whose body is not an afterthought."',
    innerWork:'What do I tell myself on the days I skip?',
    values:['Vitality','Discipline'], active:false,
    bg:'linear-gradient(145deg,#3b3524,#231e14)',
    ritual:{v:'Get outside before the first screen'},
    practice:{
      what:'The short version, on a day you\u2019d normally skip',
      freq:'2\u20134\u00d7 / week',
      do:'On a day you don\u2019t want to train, do the smallest honest version \u2014 ten minutes, one set, one walk. Do not upgrade it into a proper session. The practice is turning up, not performing.',
      counts:'You <b>started on a day you\u2019d have skipped</b>. Not when the session is good.',
    },
    voice:{
      tight:'\u201cI\u2019m too tired. I\u2019ll go properly tomorrow, when I have energy.\u201d',
      open:'\u201cNot a good session. A session. That\u2019s the whole deal.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' the reason that arrives on the days you skip'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the smallest honest version, unimproved'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' turn up in a genuinely bad week'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  courage:{
    domain:'Frontier', quality:'Emotional courage',
    shows:'You say the true thing out loud, even when it exposes you.',
    identity:'"I am becoming someone who doesn\u2019t rehearse his feelings into silence."',
    innerWork:'What have I been carrying that I have never said out loud?',
    values:['Honesty','Courage'], active:false,
    bg:'linear-gradient(150deg,#2b3d47,#18242b)',
    ritual:null,
    practice:{
      what:'Say one true thing you\u2019d normally keep in',
      freq:'2\u20134\u00d7 / week',
      do:'Find one thing you\u2019ve been holding \u2014 an appreciation, a disagreement, a want, a hurt. Say it to the person, plainly, with no long preamble. Then stop talking and let it be in the room.',
      counts:'You <b>said it out loud</b>. Not when it\u2019s received well \u2014 that part was never yours.',
    },
    voice:{
      tight:'\u201cIf I say this it changes things, and I can\u2019t take it back.\u201d',
      open:'\u201cNot saying it hasn\u2019t made it any smaller. Say it.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' the sentences you rehearse and then swallow'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one true thing, said plainly, then silence'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' say it to the person it is hardest to say to'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  creative:{
    domain:'Frontier', quality:'Creative expression',
    shows:'You make the thing, instead of only admiring people who make things.',
    identity:'"I am becoming someone who puts what he feels into something real."',
    innerWork:'What do I keep meaning to make, and what am I waiting for?',
    values:['Creativity','Expression'], active:false,
    bg:'linear-gradient(145deg,#31404a,#1c262d)',
    ritual:null,
    practice:{
      what:'Make one small thing, and take it to finished',
      freq:'2\u20134\u00d7 / week',
      do:'Photograph, write, play, build, cook \u2014 something small enough to finish in one sitting. Take it all the way to done, however rough it is. Finished and imperfect beats unstarted and ideal.',
      counts:'You <b>finished something small</b>. Not when it\u2019s good.',
    },
    voice:{
      tight:'\u201cThere\u2019s no point \u2014 people far better than me have already done this.\u201d',
      open:'\u201cNobody has made mine yet. That\u2019s the only bit that\u2019s missing.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' what you admire, and what that says you want to make'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one small thing, taken to finished'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' show one of them to somebody'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  leverage:{
    domain:'Craft', quality:'Leverage',
    shows:'You build the thing once, and it keeps paying after you\u2019ve stopped working on it.',
    identity:'"I am becoming someone who builds assets, not just income."',
    innerWork:'What am I still doing by hand that could be done once and reused?',
    values:['Freedom','Ownership'], active:false,
    bg:'linear-gradient(145deg,#42391f,#282112)',
    ritual:null,
    practice:{
      what:'Turn one repeated task into something that runs without you',
      freq:'2\u20134\u00d7 / week',
      do:'Find something you did more than twice this month. Spend one session turning it into a thing that won\u2019t need you next time \u2014 a template, a script, a system, a piece of product. It will take longer than doing it by hand again. That is the entire trade.',
      counts:'You <b>built the reusable version once</b>. Not when it has saved you time yet \u2014 that arrives later, which is the point.',
    },
    voice:{
      tight:'\u201cIt\u2019s faster if I just do it myself again.\u201d',
      open:'\u201cDoing it once properly buys back every future hour.\u201d',
    },
    span:'about 10 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' where you are personally the bottleneck'}]},
      {dur:'28 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one repeated task made reusable'}]},
      {dur:'28 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' build something that earns while you are not touching it'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  shipping:{
    domain:'Craft', quality:'Shipping',
    shows:'You put it in front of real people before you feel ready.',
    identity:'"I am becoming someone who releases things instead of polishing them in private."',
    innerWork:'What am I still \u201calmost ready\u201d to show someone?',
    values:['Courage','Momentum'], active:false,
    bg:'linear-gradient(145deg,#3f3826,#251f15)',
    ritual:null,
    practice:{
      what:'Put one unfinished thing in front of one real person',
      freq:'2\u20134\u00d7 / week',
      do:'Take the thing you keep meaning to release \u2014 the app, the page, the draft, the offer. Cut it to the smallest version that is genuinely usable, and put it in front of one person who is not you. Today, at its current quality.',
      counts:'You <b>showed it to someone real</b>. Not when the feedback is good.',
    },
    voice:{
      tight:'\u201cOne more pass, and then it\u2019s ready to show someone.\u201d',
      open:'\u201cIt learns nothing sitting in my drafts. Out it goes.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' the reason the release date keeps moving'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one unfinished thing, shown to one real person'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' launch something publicly that you consider unfinished'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  sayno:{
    domain:'Craft', quality:'Saying no',
    shows:'You turn down the good thing to protect the important one.',
    identity:'"I am becoming someone whose yes means something, because his no does."',
    innerWork:'What did I say yes to this week that I resented by Thursday?',
    values:['Focus','Self-respect'], active:false,
    bg:'linear-gradient(150deg,#3a3322,#221d13)',
    ritual:null,
    practice:{
      what:'Decline one entirely reasonable request',
      freq:'2\u20134\u00d7 / week',
      do:'Find one ask that is genuinely fine but not yours to carry. Decline it plainly \u2014 no elaborate reason, no offer to make up for it elsewhere. \u201cI can\u2019t take that on\u201d is a complete sentence.',
      counts:'You <b>declined without a paragraph of justification</b>. Not when they take it well.',
    },
    voice:{
      tight:'\u201cIt\u2019s only a small thing, and they\u2019d be disappointed.\u201d',
      open:'\u201cEvery yes is a no to something I already chose.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' what you agree to before you\u2019ve thought about it'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one plain no, no justification attached'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' decline something from someone whose approval you want'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  resourceful:{
    domain:'Craft', quality:'Resourcefulness',
    shows:'You find a way with what is actually available.',
    identity:'"I am becoming someone who starts with what\u2019s in the room."',
    innerWork:'What am I waiting to have before I begin?',
    values:['Agency','Ingenuity'], active:false,
    bg:'linear-gradient(145deg,#3c3524,#231e14)',
    ritual:null,
    practice:{
      what:'Start one thing using only what you already have',
      freq:'2\u20134\u00d7 / week',
      do:'Take something you\u2019ve postponed for lack of money, tools, time or permission. Build the constrained version \u2014 the ugly one, the manual one, the one-tenth-scale one \u2014 with what is genuinely in your hands today.',
      counts:'You <b>started the constrained version</b>. Not when it matches the one in your head.',
    },
    voice:{
      tight:'\u201cI can\u2019t really start until I have the money, the tool, or the time.\u201d',
      open:'\u201cWhat\u2019s the version I can build with what I\u2019ve got today?\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' the thing you say you\u2019re missing'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the constrained version, started anyway'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' deliver something real under a genuine constraint'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  deciding:{
    domain:'Craft', quality:'Deciding under uncertainty',
    shows:'You decide with about seventy per cent of the information, and move.',
    identity:'"I am becoming someone whose decisions don\u2019t wait for certainty that isn\u2019t coming."',
    innerWork:'What am I calling research that is actually delay?',
    values:['Clarity','Courage'], active:false,
    bg:'linear-gradient(150deg,#373020,#211c12)',
    ritual:null,
    practice:{
      what:'Make one decision you have been researching',
      freq:'2\u20134\u00d7 / week',
      do:'Take a decision you\u2019ve been circling. Write down what you\u2019d need to know to be certain \u2014 then be honest about whether that is obtainable at all. If it isn\u2019t, decide now, write the condition that would make you reverse it, and act.',
      counts:'You <b>decided and named your reversal condition</b>. Not when it turns out to have been right.',
    },
    voice:{
      tight:'\u201cI need to look into it a bit more before I commit.\u201d',
      open:'\u201cMore information wouldn\u2019t change this. Decide, and correct later.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' which decisions you have been circling for months'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' decide at 70%, name the reversal condition'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' commit to something expensive without full information'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  risk:{
    domain:'Craft', quality:'Calculated risk',
    shows:'You size the bet so a bad outcome doesn\u2019t end the game.',
    identity:'"I am becoming someone who can take a real risk without gambling."',
    innerWork:'What is the honest worst case, and could I actually survive it?',
    values:['Courage','Prudence'], active:false,
    bg:'linear-gradient(145deg,#3e3623,#241f14)',
    ritual:null,
    practice:{
      what:'Size one risk by what you could survive',
      freq:'2\u20134\u00d7 / week',
      do:'Before one meaningful commitment \u2014 money, time, reputation \u2014 write the realistic worst case in plain numbers, not adjectives. Then set the size so that worst case leaves you standing, and take it. The practice is sizing, not avoiding.',
      counts:'You <b>wrote the worst case in numbers before committing</b>. Not when the bet pays off.',
    },
    voice:{
      tight:'\u201cThis one\u2019s different. If it works it changes everything.\u201d',
      open:'\u201cHow much can I lose here and still be standing? That\u2019s the size.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' the bets you size by hope rather than by survival'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the worst case in numbers, then the size'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' take a real risk you have properly sized \u2014 and hold it through a drawdown'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  systems:{
    domain:'Craft', quality:'Systems thinking',
    shows:'You fix the process, not just this instance of the problem.',
    identity:'"I am becoming someone who solves things once."',
    innerWork:'Which problem keeps coming back wearing a different face?',
    values:['Clarity','Ownership'], active:false,
    bg:'linear-gradient(150deg,#39321f,#221d11)',
    ritual:null,
    practice:{
      what:'Find the third occurrence, and fix the pipe',
      freq:'2\u20134\u00d7 / week',
      do:'Notice something that has now gone wrong more than twice. Resist patching it again. Spend the session asking what conditions keep producing it, and change one of those conditions instead of the symptom.',
      counts:'You <b>changed a condition rather than a symptom</b>. Not when the problem is gone for good.',
    },
    voice:{
      tight:'\u201cJust sort this one out, it\u2019s quicker.\u201d',
      open:'\u201cThis is the third time. It isn\u2019t the instance, it\u2019s the pipe.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' which problems keep returning'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' change the condition, not the symptom'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' redesign something you built badly, while it is running'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  rareskill:{
    domain:'Craft', quality:'Rare skill',
    shows:'You are getting good at something few people can actually do.',
    identity:'"I am becoming someone whose skill is genuinely hard to replace."',
    innerWork:'What am I merely competent at, that I could be rare at?',
    values:['Mastery','Freedom'], active:false,
    bg:'linear-gradient(145deg,#413a25,#272115)',
    ritual:null,
    practice:{
      what:'One hour at the edge of your ability, not the middle',
      freq:'2\u20134\u00d7 / week',
      do:'Work at the point where you actually fail \u2014 not the comfortable centre of what you can already do. Pick the sub-skill you avoid precisely because you\u2019re bad at it, and spend the hour there, failing on purpose.',
      counts:'You <b>worked where you were failing</b>. Not when you got it right.',
    },
    voice:{
      tight:'\u201cI\u2019m decent at a lot of things. That\u2019s enough, surely.\u201d',
      open:'\u201cBroad is comfortable. Rare is what pays.\u201d',
    },
    span:'about 12 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' where your ability actually stops'}]},
      {dur:'28 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one hour at the failing edge'}]},
      {dur:'28 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' do work only a handful of people could have done'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  fastlearn:{
    domain:'Craft', quality:'Fast learning',
    shows:'You get to useful quickly, and then keep going.',
    identity:'"I am becoming someone who can learn his way into anything."',
    innerWork:'Where am I studying instead of starting?',
    values:['Curiosity','Agency'], active:false,
    bg:'linear-gradient(150deg,#35301f,#1f1b11)',
    ritual:null,
    practice:{
      what:'Learn one thing to the point of using it, in a single session',
      freq:'2\u20134\u00d7 / week',
      do:'Pick something you need. Spend the session getting to the smallest usable version \u2014 not to complete understanding. Then use it the same day, badly. Understanding arrives through use, not before it.',
      counts:'You <b>used it the same day, badly</b>. Not when you understand it properly.',
    },
    voice:{
      tight:'\u201cI should learn this properly first, then I\u2019ll use it.\u201d',
      open:'\u201cUse it badly today. It will make sense on the way.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' how long you prepare before you attempt'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' smallest usable version, used same-day'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' learn something under real pressure and ship with it'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  resilience:{
    domain:'Inward', quality:'Resilience',
    shows:'You take the next action while it still stings.',
    identity:'"I am becoming someone who is hard to knock out of his own life."',
    innerWork:'How long does it take me to come back, and what actually shortens it?',
    values:['Steadiness','Courage'], active:false,
    bg:'linear-gradient(155deg,#39344d,#211e2d)',
    ritual:null,
    practice:{
      what:'Name one setback, and take the next small action anyway',
      freq:'2\u20134\u00d7 / week',
      do:'When something goes wrong, let it be genuinely disappointing \u2014 don\u2019t reframe it away. Then, while it still stings, write the single next action and do it. Not the recovery plan. One action.',
      counts:'You <b>took the next action while it still stung</b>. Not when you feel better about it.',
    },
    voice:{
      tight:'\u201cThis has ruined it. I\u2019ve lost the whole thing.\u201d',
      open:'\u201cThis is a bad day inside a good direction. Both are true.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' how long the recovery takes, without judging it'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the next action, taken while it still stings'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' come back from something that genuinely matters'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  play:{
    domain:'Frontier', quality:'Play',
    shows:'You do things for no reason other than that they\u2019re good fun.',
    identity:'"I am becoming someone whose life isn\u2019t only a project."',
    innerWork:'When did I last do something with no outcome attached to it?',
    values:['Joy','Aliveness'], active:false,
    bg:'linear-gradient(150deg,#344450,#1e2932)',
    ritual:null,
    practice:{
      what:'One hour with no outcome attached',
      freq:'2\u20134\u00d7 / week',
      do:'Do something purely because it is enjoyable \u2014 no goal, no measurement, nothing to show afterwards. When you catch yourself making it productive or turning it into practice, notice it, and go back to playing.',
      counts:'You <b>did something with nothing to show for it</b>. Not when it turns out to have been useful.',
    },
    tryPool:{
      note:'If nothing comes to mind, that\u2019s the symptom, not a failing. Borrow one.',
      cats:{
        'Alone':['A video game, badly, for an hour','Draw something without trying to draw well','Build something pointless','Dance in the kitchen'],
        'With people':['A board game night','Play with a child on their terms','Karaoke','Something competitive you\u2019re bad at'],
        'Outside':['A swing or a climbing frame','Skim stones','Ride a bike with no destination'],
      },
    },
    voice:{
      tight:'\u201cI haven\u2019t got time for that. There are more useful things.\u201d',
      open:'\u201cThis doesn\u2019t have to be for anything.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' how quickly you make enjoyable things productive'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one hour with nothing to show for it'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' play in a week where you feel behind'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  seeing:{
    domain:'Together', quality:'Seeing people',
    shows:'People feel actually taken in, not just responded to.',
    identity:'"I am becoming someone whose attention is worth having."',
    innerWork:'How much of a conversation am I spending on what I\u2019ll say next?',
    values:['Attention','Respect'], active:false,
    bg:'linear-gradient(150deg,#4a373c,#2a1e23)',
    ritual:null,
    practice:{
      what:'One conversation where you ask a second question',
      freq:'2\u20134\u00d7 / week',
      do:'In one conversation, don\u2019t offer your version. When they finish, ask a second question about what they actually said \u2014 the one that shows you were listening rather than waiting. Then let them answer all the way to the end.',
      counts:'You <b>asked a second question instead of offering your version</b>. Not when the conversation goes well.',
    },
    voice:{
      tight:'\u201cYes, I know this one. Let me tell you mine.\u201d',
      open:'\u201cThere\u2019s more here than I\u2019ve got yet. Ask again.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' how early you start composing your reply'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the second question, instead of your version'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay curious about someone you disagree with'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  tenderness:{
    domain:'Together', quality:'Tenderness',
    shows:'You let warmth show in your hands and your voice, not only in what you say.',
    identity:'"I am becoming someone whose affection is visible."',
    innerWork:'Where did I learn that softness was risky?',
    values:['Tenderness','Aliveness'], active:false,
    bg:'linear-gradient(150deg,#513a38,#2e1f1f)',
    ritual:null,
    practice:{
      what:'Let one feeling show, without hedging it',
      freq:'2\u20134\u00d7 / week',
      do:'Take one moment of affection, appreciation or desire and let it be visible \u2014 in tone, in touch, in taking your time over it. No joke afterwards to take the edge off. No qualifier to make it smaller than it is.',
      counts:'You <b>let it show without the softening joke</b>. Not when it\u2019s returned.',
    },
    voice:{
      tight:'\u201cThat would be too much. Keep it light.\u201d',
      open:'\u201cLet it show. Restraint isn\u2019t the same thing as dignity.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' the moment you make a feeling smaller than it is'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one feeling, shown unhedged'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay soft when you feel exposed'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  gratitude:{
    domain:'Inward', quality:'Gratitude',
    shows:'You notice what is already here, before you notice what is missing.',
    identity:'"I am becoming someone who can see his own life while he is in it."',
    innerWork:'What do I already have that I have stopped seeing?',
    values:['Presence','Contentment'], active:false,
    bg:'linear-gradient(155deg,#3b3652,#221f2f)',
    ritual:null,
    practice:{
      what:'Name three specific things \u2014 not categories',
      freq:'2\u20134\u00d7 / week',
      do:'Write three things from today, and make them specific. Not \u201cmy health\u201d but \u201cthe twenty minutes before anyone else was awake\u201d. The specificity is the entire practice \u2014 generic gratitude does nothing at all.',
      counts:'You <b>wrote three specific things</b>. Not when you feel grateful.',
    },
    voice:{
      tight:'\u201cOnce the next thing lands, then I\u2019ll be able to enjoy this.\u201d',
      open:'\u201cThis is the life. It\u2019s happening now, in this ordinary week.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' how much of today you spent in the next thing'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' three specific things, written down'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' find three in a week that went badly'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  acceptance:{
    domain:'Inward', quality:'Acceptance',
    shows:'You meet what has already happened without arguing with it.',
    identity:'"I am becoming someone who doesn\u2019t spend his life negotiating with facts."',
    innerWork:'What am I still refusing to let be true?',
    values:['Peace','Clarity'], active:false,
    bg:'linear-gradient(160deg,#37334a,#1f1d2b)',
    ritual:null,
    practice:{
      what:'Write one fact you keep arguing with \u2014 and stop arguing',
      freq:'2\u20134\u00d7 / week',
      do:'Take something already settled that you are still fighting \u2014 a decision, a loss, a limit, an answer you were given. Write it as a plain fact with no adjectives attached. Then write the first thing you\u2019d do if it were simply true, and do that thing.',
      counts:'You <b>wrote it plainly and took one action from there</b>. Not when it stops hurting.',
    },
    voice:{
      tight:'\u201cIt shouldn\u2019t have gone like this. That isn\u2019t how it was supposed to be.\u201d',
      open:'\u201cThis is what happened. So \u2014 what\u2019s the next real move?\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'2 min',
        layers:[{s:'You only watch:',r:' the facts you are still litigating in your head'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the plain fact, then one action from there'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' accept something that genuinely was unfair'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  beauty:{
    domain:'Frontier', quality:'Beauty',
    shows:'You go out of your way for something beautiful, and let it land.',
    identity:'"I am becoming someone the world still gets through to."',
    innerWork:'When did I last stop for something for no reason at all?',
    values:['Beauty','Presence'], active:false,
    bg:'linear-gradient(145deg,#33454f,#1d2830)',
    ritual:null,
    practice:{
      what:'Go to one beautiful thing on purpose, and stay',
      freq:'2\u20134\u00d7 / week',
      do:'Choose something \u2014 a building, a record played end to end, a painting, a hill at the right hour. Go to it deliberately rather than passing it. Stay past the point where you feel you\u2019ve got it. No photograph, and don\u2019t tell anyone.',
      counts:'You <b>stayed past the point where you\u2019d normally move on</b>. Not when you feel moved.',
    },
    tryPool:{
      note:'Beauty you go to, rather than beauty that happens past you.',
      cats:{
        'To see':['A gallery, one room only','A building you\u2019ve only ever hurried past','Somewhere high, at dusk'],
        'To hear':['One album end to end, sitting down','Live music in a small room','A choir or an organ in a church'],
        'To read':['Poetry, slowly','A single chapter, twice'],
      },
    },
    voice:{
      tight:'\u201cNice. Anyway \u2014 what\u2019s next.\u201d',
      open:'\u201cStop. Look at it properly. This is what the time is for.\u201d',
    },
    span:'about 5 weeks',
    camps:[
      {dur:'7 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' how fast you move on from something good'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' go on purpose, and stay too long'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' find something beautiful in an ordinary week'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  reinvention:{
    domain:'Frontier', quality:'Reinvention',
    shows:'You let yourself become someone slightly different from who you have been.',
    identity:'"I am becoming someone who isn\u2019t finished."',
    innerWork:'Which version of me am I still defending, and how old is he?',
    values:['Freedom','Becoming'], active:false,
    bg:'linear-gradient(150deg,#2f4149,#1b262c)',
    ritual:null,
    practice:{
      what:'Do one thing that isn\u2019t \u201clike you\u201d',
      freq:'2\u20134\u00d7 / week',
      do:'Find something you\u2019ve ruled out as not your kind of thing \u2014 a room, a style, a subject, a way of speaking. Try it once, properly, with no irony and no running commentary about how unlike you it is.',
      counts:'You <b>did the thing that wasn\u2019t like you</b>. Not when it turns out to suit you.',
    },
    voice:{
      tight:'\u201cThat\u2019s not really me. I\u2019ve never been that kind of person.\u201d',
      open:'\u201cThat was true of who I was. It doesn\u2019t have to be true of who I\u2019m becoming.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' the sentences that begin \u201cI\u2019m just not the sort of person who\u2026\u201d'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one thing that isn\u2019t like you, done straight'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' let someone who has known you a long time see the change'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  ease:{
    domain:'Together', quality:'Ease',
    shows:'You stop performing \u2014 and it lands better than the performance did.',
    identity:'"I am becoming someone who doesn\u2019t have to work at being liked."',
    innerWork:'Who am I performing for, and what do I think happens if I stop?',
    values:['Authenticity','Calm'], active:false,
    bg:'linear-gradient(150deg,#463a3f,#271e22)',
    ritual:null,
    practice:{
      what:'Drop one piece of the performance',
      freq:'2\u20134\u00d7 / week',
      do:'Notice one thing you do to be received well \u2014 the impressive detail, the filled silence, the laugh that isn\u2019t quite yours, the qualification before the opinion. Leave it out this once, and let the moment be plainer than you\u2019d like.',
      counts:'You <b>left the effort out once</b>. Not when the room responds better.',
    },
    voice:{
      tight:'\u201cIf I don\u2019t make this good, it\u2019ll fall flat and so will I.\u201d',
      open:'\u201cLet it be plain. I don\u2019t have to carry the room.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' the small efforts you make to be received well'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' leave one piece of the performance out'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' stay unperformed in front of someone you want to impress'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  humour:{
    domain:'Together', quality:'Humour',
    shows:'You make the room lighter without making anyone in it smaller.',
    identity:'"I am becoming someone people are glad to have in the room."',
    innerWork:'When my jokes land badly, whose expense were they at?',
    values:['Lightness','Kindness'], active:false,
    bg:'linear-gradient(150deg,#4e3b34,#2c201c)',
    ritual:null,
    practice:{
      what:'Find the funny thing that costs nobody anything',
      freq:'2\u20134\u00d7 / week',
      do:'In one conversation, say the light thing \u2014 the absurd observation, the honest exaggeration, the thing that is simply funny about the situation. Aim it at the situation or at yourself, warmly. Never at the person who has least standing in the room.',
      counts:'You <b>made it lighter at nobody\u2019s expense</b>. Not when people laugh.',
    },
    voice:{
      tight:'\u201cBetter keep it serious. Being funny here would look like I\u2019m not taking it seriously.\u201d',
      open:'\u201cLightness isn\u2019t the opposite of depth. Say the funny thing.\u201d',
    },
    span:'about 6 weeks',
    camps:[
      {dur:'10 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' where your humour goes when you\u2019re uncomfortable'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' the light thing, at nobody\u2019s expense'}]},
      {dur:'14 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' find the lightness in a genuinely tense moment'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  grace:{
    domain:'Together', quality:'Grace',
    shows:'You let people keep their dignity, including when you could take it.',
    identity:'"I am becoming someone people are safe around when I hold the cards."',
    innerWork:'Who do I become when I have the advantage?',
    values:['Respect','Generosity'], active:false,
    bg:'linear-gradient(150deg,#443338,#261b1f)',
    ritual:null,
    practice:{
      what:'Decline one advantage you could fairly take',
      freq:'2\u20134\u00d7 / week',
      do:'Find one moment where you could be right at someone\u2019s expense \u2014 the correction, the last word, the point scored, the reminder of who did what. Leave it unsaid. Not because you were wrong, but because winning it costs them more than it gives you.',
      counts:'You <b>let one go that you could have won</b>. Not when they notice, and not when they deserve it.',
    },
    voice:{
      tight:'\u201cThey were wrong, and they should know it.\u201d',
      open:'\u201cBeing right isn\u2019t worth what it would cost them.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' who you become in the moments you hold the power'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' one advantage, declined'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' be gracious to someone who was not gracious to you'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
  boundaries:{
    domain:'Together', quality:'Boundaries',
    shows:'You hold the line when holding it costs you something.',
    identity:'"I am becoming someone whose limits don\u2019t move under pressure."',
    innerWork:'Which limit do I state clearly, and then quietly let slide?',
    values:['Self-respect','Honesty'], active:false,
    bg:'linear-gradient(150deg,#40333a,#241a20)',
    ritual:null,
    practice:{
      what:'Hold one limit you\u2019d normally let slide',
      freq:'2\u20134\u00d7 / week',
      do:'Pick a limit you have stated before and then quietly abandoned \u2014 a time, a topic, a way of being spoken to. When it gets tested this week, hold it. Once, plainly, without offering a new explanation. Then stay exactly where you are.',
      counts:'You <b>held it once without renegotiating</b>. Not when they take it well.',
    },
    voice:{
      tight:'\u201cIf I hold this they\u2019ll think I\u2019m difficult, and it isn\u2019t worth the friction.\u201d',
      open:'\u201cThe limit is the limit. Their disappointment isn\u2019t my emergency.\u201d',
    },
    span:'about 8 weeks',
    camps:[
      {dur:'14 days',state:'locked',effort:'1 min',
        layers:[{s:'You only watch:',r:' which limits you state and then let slide'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The practice:',r:' hold one limit, plainly, without renegotiating'}]},
      {dur:'21 days',state:'locked',effort:'2\u20134\u00d7/wk',
        layers:[{s:'The test:',r:' hold a limit with someone whose approval you want'}]},
    ],
    cta:'Start this path',sec:'Save as a seed instead',
  },
};

/* ── What each quality buys you ────────────────────────────────
   Domain says WHERE a quality lives. This says WHAT IT'S FOR.
   Qualities serving three aims at once are the leverage points —
   objective information, not a score. */
export const AIMS: readonly string[] = ['Freedom','Peace','Love','Aliveness','Mastery'];
export const AIM_NOTE: Record<string, string> = {
  Freedom:'money, autonomy, options',
  Peace:'steadiness, non-reactivity',
  Love:'reciprocal adult relationships',
  Aliveness:'curiosity, creativity, an interesting life',
  Mastery:'skill, discipline, execution',
};
export const SERVES: Record<string, string[]> = {
  stillness:['Peace'],                       presence:['Peace','Love','Aliveness'],
  selfpossession:['Peace','Love'],           solitude:['Peace','Freedom'],
  nonattachment:['Peace','Freedom','Love'],  embodied:['Peace','Mastery'],
  resilience:['Peace','Mastery','Freedom'],  gratitude:['Peace','Love','Aliveness'],
  acceptance:['Peace','Freedom'],
  warmth:['Love','Aliveness'],               authority:['Love','Freedom','Mastery'],
  reciprocity:['Love','Peace'],              repair:['Love','Peace'],
  sharing:['Love','Aliveness','Mastery'],    seeing:['Love','Aliveness','Peace'],
  tenderness:['Love','Aliveness'],
  craft:['Mastery','Freedom'],               followthrough:['Mastery','Freedom'],
  longview:['Freedom','Peace'],              agency:['Freedom','Mastery','Peace'],
  stewardship:['Freedom','Peace'],           discipline:['Mastery','Peace'],
  leverage:['Freedom','Mastery'],            shipping:['Freedom','Mastery'],
  sayno:['Freedom','Peace','Mastery'],       resourceful:['Freedom','Mastery'],
  deciding:['Freedom','Mastery'],            risk:['Freedom','Mastery'],
  systems:['Freedom','Mastery'],             rareskill:['Freedom','Mastery'],
  fastlearn:['Freedom','Mastery','Aliveness'],
  curiosity:['Aliveness','Freedom','Peace'], courage:['Love','Aliveness','Peace'],
  creative:['Aliveness','Love'],             play:['Aliveness','Peace','Love'],
  beauty:['Aliveness','Peace'],              reinvention:['Aliveness','Freedom'],
  ease:['Love','Peace','Aliveness'],         humour:['Love','Aliveness','Peace'],
  grace:['Love','Peace','Mastery'],          boundaries:['Love','Peace','Freedom'],
};

/* Each domain already implies one aim — every Inward quality buys Peace,
   every Together one buys Love, and so on. Showing it again on the card was
   a tag carrying no information, so cards show only what a quality pays into
   BEYOND its own home. */
export const DOMAIN_AIM: Record<string, string> = { Inward:'Peace', Together:'Love', Craft:'Freedom', Frontier:'Aliveness' };
export const extraAims = (id: string): string[] =>
  ((SERVES as Record<string, string[]>)[id] || []).filter(
    (a: string) => a !== DOMAIN_AIM[(DATA as Record<string, { domain: string }>)[id].domain],
  );

/* Marked by the user, not assigned by the app — the shortlist that
   matters most to them, for whatever reason they don't have to state. */
export let CORE = new Set(['selfpossession','solitude','nonattachment','boundaries','curiosity','creative','play','gratitude','courage','reciprocity','reinvention']);

/* Self-claimed, permanent, gold. Never re-offered in Browse: you cannot
   start something that has already become part of you. */
export const INTEGRATED = new Set(['constancy','attention']);

export const WINDOW_DAYS = 14;

export const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`;
export const sinceLine = (c: { returnsTotal: number; weeks: number; campsClosed: number }): string =>
  `${plural(c.returnsTotal,'return')} \u00b7 ${plural(c.weeks,'week')} \u00b7 ${plural(c.campsClosed,'camp')} closed`;


