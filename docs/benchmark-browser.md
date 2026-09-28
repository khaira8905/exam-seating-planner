<!-- measured with Playwright against the production build (`npm run build && npm run preview`) on 2026-09-28 -->
_Headless Chromium on the same machine as the Node benchmark (Intel Xeon @ 2.10 GHz, 4 threads) · Optimised (HiGHS) method · 3 runs each_

| Students | Rule | Solver time (shown in the app) | Click "Generate" → plan on screen | Clashes |
|---:|---|---:|---:|---:|
| 300 | Strict | 0.89 – 1.07 s | 1.4 s | 0 |
| 300 | Very strict | 1.55 – 1.58 s | 1.9 s | 0 |
| 1,200 | Strict | 1.97 – 2.15 s | 2.4 – 2.5 s | 0 |
| 1,200 | Very strict | 3.67 – 3.85 s | 5.2 – 5.7 s | 0 |
| 5,000 | Strict | 2.57 – 2.70 s | 3.6 – 3.7 s | 0 |
| 5,000 | Very strict | 4.81 – 4.91 s | 5.8 – 5.9 s | 0 |
