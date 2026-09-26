# Empathy Engine

Start this app Facial reaction detection

Detect faces in real time video (use presage for vitals/facial expressions of users, but other video data can come from other tools if presage is not able to do it)

Track expression changes over a period of time

Classify simple observable signals like smile, surprise, confusion/negative expression, neutral, attention shift

Store reactions with timestamp information

Reaction analytics dashboard powered by agent

Video playback

Agent chatbot

Generated recommendations things to review

Timeline graph underneath showing reaction intensity over time

Emoji markers at interesting timestamps: 😄 😮 😕 😐

Click an emoji/peak → jump directly to that moment in the video

Summary such as:

Most positive moment: 1:34

Biggest reaction: 2:07

Most negative expression shift: 3:12

Top 5 moments to review

General structure ideas

Sharable link, made by “Product owners” and sent to Users/testers

Product owners should be able to upload testable content (videos for now)

How to setup page shown to users for how to get good lighting, etc to get good footage

Wants (outside initial mvp)

Live vid

Product owners should be able to upload testable content (videos for now)

How to setup page shown to users for how to get good lighting, etc to get good footage

User Stories

As a content creator, I want automatically detected facial expressions throughout my video so that I can quickly pinpoint moments where viewers were most engaged or confused.

As a UX researcher, I want an interactive timeline dashboard with emoji markers at key reaction timestamps so that I can immediately jump to critical feedback moments during user testing sessions.

As a video editor, I want a summary highlight of the top 5 reaction moments so that I can efficiently curate promotional clips or trim low-engagement sections.

## Development

Requires Node.js 20+.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

The backend (FastAPI) lives in `../backend`; see `../backend/API.md`.
