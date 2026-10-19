/* One journey page for Growth Paths and Foundations. Sections render only when the journey has that content. */
(function () {
  const J = {
    stillness: {
      kind: 'path', hue: 'inward', icon: 'moon', category: 'Self-awareness', back: ['Self-awareness', 'paths-inward.html'],
      title: 'Stillness', line: 'Pause before you react, not only after.',
      freq: '2–4× a week',
      practice: 'In a moment where you would normally react immediately, pause before responding.',
      counts: 'you noticed the impulse and created even a small pause.',
      not: 'when you feel calm. That part is not up to you.',
      state: 'walking', returns: 5, last: 'Last return yesterday',
      examplesTitle: 'In real life',
      examples: ['You catch the sharp reply before it leaves your mouth.', 'You put the phone face-down instead of firing back.', 'You sit through a hard meeting without needing to fix it.'],
      voice: ['“I don’t have time for this. I should be getting on with something.”', '“This is the thing I’m doing. It can take as long as it takes.”'],
      about: 'Stillness is creating a pause before an automatic reaction. It gives you peace and presence. It is not calm, and it is not pushing feelings down: it is the small gap in which you get to choose. A question to carry: where do I rush, and what am I avoiding by rushing?',
    },
    regulate: {
      kind: 'foundation', hue: 'foundation', icon: 'layers', category: 'The Ground', back: ['Paths', 'you-paths.html'],
      title: 'Regulate', line: 'Notice activation and settle enough to choose the next action.',
      practice: 'Notice activation. Use one settling tool. Continue when you have enough space to choose.',
      counts: 'you use one settling tool and choose what comes next.',
      state: 'walking', returns: 2, last: 'Last return Monday',
      examplesTitle: 'Tools you can use',
      examples: ['Slow breathing', 'Orienting to your surroundings', 'Grounding through the senses', 'A longer exhale', 'Unclenching, dropping the shoulders'],
      habits: [['5-minute meditation', 'Sit, breathe, or settle for five minutes.', true]],
      about: 'Regulate builds the capacity to notice activation and deliberately settle enough to choose the next action. The tools are practical, not medical: they do not reset or treat anything. They make a little room, and the choice is yours.',
    },
    tendbody: {
      kind: 'foundation', hue: 'foundation', icon: 'layers', category: 'The Ground', back: ['Foundations', 'foundations-house.html'],
      title: 'Tend the Body', line: 'Support the physical floor required for everything else.',
      practice: 'Notice one basic body need being neglected and meet it in the smallest useful way.',
      counts: 'you meet one basic need in a small useful way.',
      state: 'new', returns: 0,
      examplesTitle: 'What it covers',
      examples: ['Sleep basics', 'A daily movement baseline', 'Hydration', 'Hygiene and self-care', 'Your own medication or supplement reminders', 'Morning light', 'Recovery and wind-down'],
      habits: [['Water on waking', 'Drink some water after getting up.', true], ['Morning daylight', 'Get outside or into natural daylight after waking.', true], ['Daily movement minimum', 'Do the smallest useful amount of movement today.', false]],
      habitsMore: 7,
      about: 'Tend the Body supports the physical floor that everything else stands on. Compass does not recommend medication, supplements, exercise intensity, or medical treatment: the habits here are the ones you choose.',
    },
    warmth: {
      kind: 'path', hue: 'together', icon: 'users', category: 'Connection', back: ['Paths', 'you-paths.html'],
      title: 'Warmth', line: 'People notice that you noticed them.',
      freq: '2–4× a week',
      practice: 'When genuine warmth arises, express it instead of keeping it inside.',
      counts: 'one sincere warm response, acknowledgement, or kindness is expressed.',
      not: 'when they respond well. Their reaction is theirs.',
      state: 'paused', returns: 4, last: 'Paused on 3 October · all 4 returns kept',
      examplesTitle: 'In real life',
      examples: ['You say the specific thing you noticed instead of “nice one”.', 'You stay with someone’s answer instead of moving to your next question.', 'You send the message you’d normally rewrite six times.'],
      voice: ['“If I say something kind it’ll land awkwardly and they won’t care.”', '“I’ll say the kind thing. What they do with it is theirs.”'],
      about: 'Warmth gives you kindness and connection. It is never a quota of nice things: it is letting real warmth show when it is already there. A question to carry: what makes me withhold warmth?',
    },
    courage: {
      kind: 'path', hue: 'frontier', icon: 'compass', category: 'Aliveness', back: ['Paths', 'you-paths.html'],
      title: 'Emotional Courage', line: 'Say the true thing even when it exposes you.',
      freq: '2–4× a week',
      practice: 'Allow one genuine feeling, preference, need, or truth to be visible without hiding it behind a joke, apology, or hedge.',
      counts: 'the honest thing becomes visible.',
      not: 'when it is received well. That part was never yours.',
      state: 'reflection', returns: 15, last: 'Last return Tuesday',
      voice: ['“If I say this it changes things, and I can’t take it back.”', '“Not saying it hasn’t made it any smaller. Say it.”'],
      about: 'Emotional Courage gives you honesty and courage. A question to carry: what have I been carrying that I have never said out loud?',
    },
    curiosity: {
      kind: 'path', hue: 'frontier', icon: 'compass', category: 'Aliveness', back: ['Paths', 'you-paths.html'],
      title: 'Curiosity', line: 'Move toward what you do not understand.',
      freq: '2–4× a week',
      practice: 'Follow one genuine question into something you do not yet understand before judging, dismissing, or closing it.',
      counts: 'you genuinely investigate, ask, explore, or test.',
      not: 'when you reach a final answer.',
      state: 'steady', returns: 18, last: 'Steady since 2 October',
      voice: ['“I’d only embarrass myself. I’ll stick to what I know.”', '“I have no idea how this goes. Let’s find out.”'],
      about: 'Curiosity gives you curiosity and adventure. A question to carry: what keeps me small and safe?',
    },
  };

  const esc = (s) => s;
  function stageLine(n, state) {
    if (state === 'steady') return `${n} returns. Steady is yours, and there is nothing to keep up.`;
    if (state === 'paused') return `Paused at ${n} returns. Resume whenever you like; nothing is lost.`;
    if (n === 0) return 'Starts with Watching: three returns of only noticing.';
    if (n < 3) return `Camp 1 · Watching · ${n} ${n === 1 ? 'return' : 'returns'}. ${3 - n} more ${3 - n === 1 ? 'opens' : 'open'} Doing.`;
    if (n < 9) return `Camp 2 · Doing · ${n} returns. ${9 - n} more open Under pressure.`;
    if (n < 15) return `Camp 3 · Under pressure · ${n} returns. Reflection opens at 15.`;
    return `Camp 3 · Under pressure · ${n} returns. The whole route is walked.`;
  }

  window.renderJourney = function (id, mount) {
    const d = J[id];
    const c = `var(--${d.hue})`, deep = `var(--${d.hue}-deep)`;
    const typeLabel = d.kind === 'path' ? 'Growth path' : 'Foundation';
    const walking = d.state === 'walking' || d.state === 'reflection';
    const started = d.state !== 'new';
    const noun = d.kind === 'path' ? 'path' : 'foundation';
    const action = {
      new: `<a class="btn" style="margin-top:14px">Start this ${noun}</a>`,
      walking: '<a class="btn" style="margin-top:14px">I came back</a>',
      reflection: '<a class="btn" style="margin-top:14px">I came back</a><a class="btn soft" style="margin-top:8px">Claim Steady</a>',
      paused: '<a class="btn" style="margin-top:14px">Resume</a>',
      steady: '',
    }[d.state];
    const meta = d.state === 'new' ? 'Uses your last open slot · 2 of 3 active' : d.last;
    let h = '';

    h += `<nav class="nav"><a href="${d.back[1]}"><svg class="i lg"><use href="#i-back"/></svg>${d.back[0]}</a></nav>`;
    h += `<div class="kicker" style="color:${deep}"><svg class="i sm"><use href="#i-${d.icon}"/></svg>${d.category} · ${typeLabel}</div>`;
    h += `<h1 class="title">${d.title}</h1><p class="lede">${d.line}</p>`;

    // The practice and its action come first: it is what the person opened the page to do.
    h += `<div class="card" style="margin-top:18px">
      <div class="card-head"><span class="cat" style="color:${deep}">The practice</span>${d.freq ? `<span class="when">${d.freq}</span>` : ''}</div>
      <p class="hero-t" style="font-size:19px">${d.practice}</p>
      <p class="counts"><b>It counts when</b> ${d.counts}</p>
      ${d.not ? `<p class="counts" style="margin-top:4px"><b>Not</b> ${d.not}</p>` : ''}
      ${action}
      <p class="meta-c" style="margin-top:8px">${meta}</p>
    </div>`;
    if (d.state === 'reflection') {
      h += `<div class="card" style="background:var(--${d.hue}-soft)"><p class="body" style="color:${deep}"><b>Reflection is open.</b> Does this feel like yours now? Claim Steady only if it does. There is no rush, and returning still counts.</p></div>`;
    }

    // One progress view; the full history is one tap away, as in Health's Show All Data.
    const progressInner = `<div class="card-head"><span class="cat" style="color:${deep}">Progress</span>${started ? '<span class="when">All returns <svg class="chev"><use href="#i-chev"/></svg></span>' : ''}</div>
      <div data-route="${d.returns}" data-hue="${d.hue}" data-size="big"${d.state === 'steady' ? ' data-steady="1"' : ''}></div>
      <p class="sub" style="margin-top:8px">${stageLine(d.returns, d.state)}</p>`;
    h += started ? `<a class="card" href="path-returns.html">${progressInner}</a>` : `<div class="card">${progressInner}</div>`;

    if (d.examples) {
      h += `<div class="sec"><h2>${d.examplesTitle}</h2></div><div class="list plain">` +
        d.examples.map((e) => `<div class="row" style="min-height:0;padding:10px 16px"><span class="txt" style="font-size:15px">${e}</span></div>`).join('') + '</div>';
    }

    if (d.voice) {
      h += `<div class="sec"><h2>The sentence</h2></div><div class="card">
        <p class="q tight" style="margin:0"><span class="q-label">When it is tight</span>${d.voice[0]}</p>
        <p class="q" style="margin-top:12px"><span class="q-label" style="color:${deep}">The one you are practising</span>${d.voice[1]}</p></div>`;
    }

    if (d.habits) {
      h += `<div class="sec"><h2>Daily habits</h2><span class="meta">Optional</span></div><div class="list plain">` +
        d.habits.map(([n, s, added]) => `<div class="row"><div class="txt"><div class="t">${n}</div><div class="s">${s}</div></div>${added ? '<span class="tag">Added</span>' : '<svg class="i" style="color:var(--tint)"><use href="#i-plus"/></svg>'}</div>`).join('') +
        (d.habitsMore ? `<a class="row action"><span class="txt t">Show all ${d.habitsMore}</span><svg class="chev"><use href="#i-chev"/></svg></a>` : '') +
        '</div><p class="foot">Habits live in Log · Habits and do not use a journey slot.</p>';
    }

    h += `<div class="sec"><h2>About</h2></div><div class="card">
      <p class="body clamp" id="about">${esc(d.about)} The first three returns are only noticing. The practice deepens in Doing, and Under pressure asks whether it holds when something actually goes wrong. Steady is yours to claim, never awarded.</p>
      <button class="more-btn" data-more="about">Show more</button></div>`;

    if (walking) {
      h += `<div class="list plain" style="margin-top:22px"><a class="row"><span class="txt t">Pause for now</span><span class="r">Keeps every return</span></a></div>
        <p class="foot">2 of 3 journeys active.</p>`;
    }

    mount.innerHTML = h;
  };
})();
