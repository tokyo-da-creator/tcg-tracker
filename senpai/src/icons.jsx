// Clean stroke icon set (currentColor)
export default function Icon({ name, size = 24, stroke = 1.7, color, style = {} }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" {...p} /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" {...p} /></>,
    homeFill: <><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1V10.5Z" fill="currentColor" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" /></>,
    search: <><circle cx="11" cy="11" r="7" {...p} /><path d="m20 20-3.5-3.5" {...p} /></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" {...p} /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" {...p} /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" {...p} /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" {...p} /></>,
    gridFill: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" fill="currentColor" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" fill="currentColor" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" fill="currentColor" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" fill="currentColor" /></>,
    person: <><circle cx="12" cy="8" r="3.6" {...p} /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" {...p} /></>,
    personFill: <><circle cx="12" cy="8" r="3.8" fill="currentColor" /><path d="M5 20.5c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2Z" fill="currentColor" /></>,
    plus: <><path d="M12 5v14M5 12h14" {...p} /></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.5 2 6.5H4c.8-1 2-2.5 2-6.5Z" {...p} /><path d="M9.5 19a2.5 2.5 0 0 0 5 0" {...p} /></>,
    heart: <><path d="M12 20s-7-4.4-9.3-8.4C1 8.6 2.6 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.4 0 5 3.6 3.3 6.6C19 15.6 12 20 12 20Z" {...p} /></>,
    heartFill: <><path d="M12 20.3s-7.2-4.5-9.4-8.6C.8 8.4 2.5 4.6 6 4.6c2 0 3.3 1.2 4 2.4.7-1.2 2-2.4 4-2.4 3.5 0 5.2 3.8 3.4 7.1C19.2 15.8 12 20.3 12 20.3Z" fill="currentColor" /></>,
    star: <><path d="m12 3.5 2.6 5.6 6 .7-4.4 4.2 1.2 6L12 17.6 6.6 20l1.2-6L3.4 9.8l6-.7L12 3.5Z" {...p} /></>,
    starFill: <><path d="m12 3.2 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17.4 6.4 20.5l1.2-6.2-4.6-4.3 6.3-.8L12 3.2Z" fill="currentColor" /></>,
    chevL: <><path d="m15 5-7 7 7 7" {...p} /></>,
    chevR: <><path d="m9 5 7 7-7 7" {...p} /></>,
    chevD: <><path d="m5 9 7 7 7-7" {...p} /></>,
    ellipsis: <><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
    play: <><path d="M7 4.5 19 12 7 19.5V4.5Z" fill="currentColor" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" /></>,
    share: <><path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" {...p} /><path d="M5 12v6.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V12" {...p} /></>,
    bookmark: <><path d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.5L5 20V5.5a1 1 0 0 1 1-1Z" {...p} /></>,
    bookmarkFill: <><path d="M6 4.2h12a1 1 0 0 1 1 1V20l-7-3.5L5 20V5.2a1 1 0 0 1 1-1Z" fill="currentColor" /></>,
    comment: <><path d="M4.5 6a1.5 1.5 0 0 1 1.5-1.5h12A1.5 1.5 0 0 1 19.5 6v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V6Z" {...p} /></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...p} /><circle cx="12" cy="12" r="3" {...p} /></>,
    check: <><path d="m5 12.5 4.5 4.5L19 6.5" {...p} /></>,
    checkCircle: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="m8.5 12 2.4 2.4 4.6-4.8" {...p} /></>,
    clock: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 7.5V12l3 2" {...p} /></>,
    pause: <><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" /><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" {...p} /></>,
    trophy: <><path d="M7 4.5h10V9a5 5 0 0 1-10 0V4.5Z" {...p} /><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 3M17 6h2.5a2.5 2.5 0 0 1-2.5 3M9.5 14.5 9 19h6l-.5-4.5M7.5 19h9" {...p} /></>,
    flame: <><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.5C8.5 9.8 9 11 9 11s.5-5 3-8Z" {...p} /></>,
    sparkle: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" {...p} /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" {...p} /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" {...p} /></>,
    mic: <><rect x="9" y="3.5" width="6" height="11" rx="3" {...p} /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" {...p} /></>,
    plusCircle: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 8.5v7M8.5 12h7" {...p} /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...p} /><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5" {...p} /></>,
    chart: <><path d="M4 20V4M4 20h16" {...p} /><path d="M8 16v-3M12 16V9M16 16v-5" {...p} /></>,
    repeat: <><path d="M4 9V7.5A2.5 2.5 0 0 1 6.5 5H17l-2.5-2.5M20 15v1.5a2.5 2.5 0 0 1-2.5 2.5H7l2.5 2.5" {...p} /></>,
    send: <><path d="M4.5 12 20 4.5 14.5 20l-3-6.5-7-1.5Z" {...p} /></>,
    settings: <><circle cx="12" cy="12" r="3" {...p} /><path d="M19 12a7 7 0 0 0-.1-1.2l1.8-1.3-1.8-3.1-2.1.8a7 7 0 0 0-2-1.2L14.4 3H9.6l-.4 2a7 7 0 0 0-2 1.2l-2.1-.8L3.3 8.5l1.8 1.3A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-1.8 1.3 1.8 3.1 2.1-.8a7 7 0 0 0 2 1.2l.4 2h4.8l.4-2a7 7 0 0 0 2-1.2l2.1.8 1.8-3.1-1.8-1.3c.1-.4.1-.8.1-1.2Z" {...p} /></>,
    plusSquare: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...p} /><path d="M12 8.5v7M8.5 12h7" {...p} /></>,
    arrowUp: <><path d="M12 19V5M12 5l-6 6M12 5l6 6" {...p} /></>,
    arrowR: <><path d="M5 12h14M13 6l6 6-6 6" {...p} /></>,
    globe: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17" {...p} /></>,
    list: <><path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" {...p} /></>,
    fan: <><path d="M12 21a9 9 0 1 0-9-9" {...p} /><path d="M12 12 5 9" {...p} /></>,
    quote: <><path d="M9 7c-2.2 0-4 1.8-4 4v6h6v-6H7c0-1.1.9-2 2-2V7Zm10 0c-2.2 0-4 1.8-4 4v6h6v-6h-4c0-1.1.9-2 2-2V7Z" fill="currentColor" stroke="none" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', color, flexShrink: 0, ...style }} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}
