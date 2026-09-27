<div align="center">

# nix408

WhatsApp Web automation for Node.js.

A fork of [@itsliaaa/baileys](https://github.com/itsliaaa/baileys), which itself forks
[WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys). It keeps the WhatsApp Web
protocol implementation and adds the message types WhatsApp ships today.

[![repo](https://img.shields.io/badge/repo-marrspace%2Fnix408-0b0f14?style=flat-square&logo=github)](https://github.com/marrspace/nix408)
[![license](https://img.shields.io/badge/license-MIT-22d3ee?style=flat-square)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

</div>

```bash
npm install github:marrspace/nix408#main
```

[Quick start](#quick-start) &nbsp;·&nbsp; [Documentation](#documentation) &nbsp;·&nbsp; [Credits](#credits)

---

## About

nix408 is a Baileys fork. The protocol work is upstream; what we add is the message
types that upstream does not send yet:

- interactive messages, albums, rich responses and payments;
- a codebase you can actually read, with no obfuscation;
- a runnable example for every feature in this file.

It is a fork, and this file says so. The upstream authors are credited at the bottom and
in [LICENSE](LICENSE).

> If you fork nix408, keep the credits. That is the whole deal.

## At a glance

| | |
| --- | --- |
| Package | `nix408`, installed from GitHub (not on npm) |
| Runtime | Node.js ≥ 20, ESM first (`require()` works too) |
| Socket variable | `nix` in every example: `const nix = makeWASocket(...)` |
| Message types | Text, media, albums, buttons, lists, flows, polls, payments, rich responses |
| Management | Newsletters, groups, communities, profiles, privacy, business |
| Auth | Multi-file, single-file and SQLite auth state |

## Why nix408

- Buttons, lists, native flows, carousels, albums, polls, payments, rich responses, code blocks, tables and inline entities all send from one library.
- Open any file and you can follow it. No obfuscation.
- Media upload to channels works. It did not upstream.
- FFmpeg runs through `spawn`, not `exec`.
- Image and audio backends are optional peer dependencies, so you install only what you use.
- Every feature below has a snippet you can paste and run.

## What's inside

| Feature | What you get |
| --- | --- |
| Interactive messages | Buttons, lists, native flows, hydrated templates, carousels |
| Albums | Several images or videos in one message |
| Rich responses | Structured replies with tables, code blocks and citations |
| Payments | Payment requests, invites, orders, invoices |
| Sticker packs | Multi-sticker packs with cover and metadata |
| Polls and events | Native polls, calendar events, group invites |
| Ephemeral / view-once | Flags, including view-once V2 and its extension |
| Newsletters | Management API plus the media upload fix |
| Groups and communities | Full management APIs |

## How nix408 compares

Three libraries, one lineage. This is what each one gives you.

| | WhiskeySockets/Baileys | @itsliaaa/baileys | nix408 |
| --- | --- | --- | --- |
| Interactive messages, albums, rich responses | no | yes | yes |
| Newsletter media upload | broken | fixed | fixed |
| FFmpeg process handling | `exec` | `spawn` | `spawn` |
| `makeInMemoryStore` on v7 | removed | restored | restored |
| Upstream branding inside the code | none | `Lia@` notes, custom logger names, personal strings | removed |
| Documentation | plain API dump | emoji headings, one long page | rewritten, with an AI Rich guide |
| Subpath imports | no | no | yes (`nix408/Utils`, `nix408/WAProto`, ...) |
| Install | `npm i baileys` | `npm i @itsliaaa/baileys` | GitHub for now |

If you only need the upstream protocol, use Baileys. If you want the extra message types with the
branding stripped out and the docs cleaned up, that is what nix408 is.

## Requirements

- Node.js 20 or newer. `engine-requirements.js` checks this at install time.
- ESM first: `"type": "module"`. CommonJS `require()` is tested on Node 24.

## Quick start

```bash
npm install github:marrspace/nix408#main
```

```javascript
import { makeWASocket, useMultiFileAuthState } from 'nix408'

const { state, saveCreds } = await useMultiFileAuthState('auth_info')
const nix = makeWASocket({ auth: state })

nix.ev.on('creds.update', saveCreds)
nix.ev.on('connection.update', ({ connection }) => {
  if (connection === 'open') console.log('connected')
})
```

Full walkthrough: [Connecting to WhatsApp](#connecting-to-whatsapp).

## Documentation

Every section below is a reference with runnable examples. The socket variable is `nix`
throughout. Use the table of contents to jump to a topic.

<details open>
<summary><b>Table of contents</b></summary>

- [Installation](#installation)
  - [Import (ESM & CJS)](#import-esm--cjs)
  - [Subpath imports](#subpath-imports)
- [Connecting to WhatsApp](#connecting-to-whatsapp)
  - [Auth State](#auth-state)
- [Data store](#data-store)
- [WhatsApp IDs](#whatsapp-ids)
- [Sending messages](#sending-messages)
  - [Text](#text)
  - [Mention](#mention)
  - [Reaction](#reaction)
  - [Pin Message](#pin-message)
  - [Keep Chat](#keep-chat)
  - [Forward Message](#forward-message)
  - [Contact](#contact)
  - [Location](#location)
  - [Event](#event)
  - [Group Invite](#group-invite)
  - [Product](#product)
  - [Poll](#poll)
  - [Button Response](#button-response)
  - [AI Rich messages](#ai-rich-messages)
  - [Status Mention](#status-mention)
- [Sending media](#sending-media)
  - [Image](#image)
  - [Video](#video)
  - [Sticker](#sticker)
  - [Audio](#audio)
  - [Document](#document)
  - [Album (Image & Video)](#album-image--video)
  - [Sticker Pack](#sticker-pack)
- [Interactive messages](#interactive-messages)
  - [Buttons](#buttons)
  - [List](#list)
  - [Interactive](#interactive)
  - [Hydrated Template](#hydrated-template)
- [Payment messages](#payment-messages)
  - [Invite Payment](#invite-payment)
  - [Invoice](#invoice)
  - [Order](#order)
  - [Request Payment](#request-payment)
- [Message options](#message-options)
  - [AI Icon](#ai-icon)
  - [Ephemeral](#ephemeral)
  - [External Ad Reply](#external-ad-reply)
  - [Group Status](#group-status)
  - [Lottie Sticker](#lottie-sticker)
  - [Raw](#raw)
  - [Secure Meta Service Label](#secure-meta-service-label)
  - [Spoiler](#spoiler)
  - [View Once](#view-once)
  - [View Once V2](#view-once-v2)
  - [View Once V2 Extension](#view-once-v2-extension)
  - [View Once V2 (text only)](#view-once-v2-text-only)
- [Experimental features](#experimental-features)
  - [AI Rich: raw HTML](#ai-rich-raw-html)
  - [AI Rich: image grid and entity card](#ai-rich-image-grid-and-entity-card)
  - [Bloks widget (A2UI)](#bloks-widget-a2ui)
  - [Raw experimental messages](#raw-experimental-messages)
- [Modifying messages](#modifying-messages)
  - [Delete Messages](#delete-messages)
  - [Edit Messages](#edit-messages)
- [API reference](#api-reference)
  - [Find User ID (JID|PN/LID)](#find-user-id-jidpnlid)
  - [Request Custom Pairing Code](#request-custom-pairing-code)
  - [Image Processing](#image-processing)
  - [Newsletter Management](#newsletter-management)
  - [Group Management](#group-management)
  - [Community Management](#community-management)
  - [Profile Management](#profile-management)
  - [Business Management](#business-management)
  - [Privacy Management](#privacy-management)
  - [Events](#events)

</details>

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Installation

nix408 is distributed through GitHub. It is **not** published on npm.

- **Terminal**

```bash
npm install github:marrspace/nix408#main
# or
yarn add github:marrspace/nix408#main
# or
pnpm add github:marrspace/nix408#main
```

- **package.json**

```json
"dependencies": {
   "nix408": "github:marrspace/nix408#main"
}
```

#### Import (ESM & CJS)

```javascript
// --- ESM
import { makeWASocket } from 'nix408'

// --- CJS (works on Node.js 24)
const { makeWASocket } = require('nix408')
```

#### Subpath imports

Import only the part you need instead of the whole package. Every subpath below ships its own
types, so your editor autocompletes without pulling in the rest.

```javascript
import { makeWASocket } from 'nix408'                 // main entry
import { tokenizeCode, prepareRichResponseMessage } from 'nix408/Utils'
import { proto } from 'nix408/WAProto'
import { Browsers } from 'nix408/Utils'
import { DisconnectReason } from 'nix408/Types'
import { makeInMemoryStore } from 'nix408/Store'
```

Available subpaths:

| Subpath | Contains |
| --- | --- |
| `nix408` | Everything, the main entry point |
| `nix408/Utils` | Helpers: `tokenizeCode`, message builders, media, auth state |
| `nix408/Types` | TypeScript types and enums |
| `nix408/Defaults` | Default config, `DONATE_URL`, `LIBRARY_NAME` |
| `nix408/Store` | `makeInMemoryStore` |
| `nix408/Socket` | The socket implementation |
| `nix408/WABinary` | Binary encode/decode and language keyword tables |
| `nix408/WAM` | WhatsApp metrics |
| `nix408/WAUSync` | USync protocol |
| `nix408/WAProto` | Protobuf message definitions |

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Connecting to WhatsApp

```javascript
import { makeWASocket, delay, DisconnectReason, useMultiFileAuthState } from 'nix408'
import { Boom } from '@hapi/boom'
import pino from 'pino'

// --- Connect with pairing code
const myPhoneNumber = '6288888888888'

const logger = pino({ level: 'silent' })

const connectToWhatsApp = async () => {
   const { state, saveCreds } = await useMultiFileAuthState('session')
    
   const nix = makeWASocket({
      logger,
      auth: state
   })

   nix.ev.on('creds.update', saveCreds)

   nix.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'connecting' && !nix.authState.creds.registered) {
         await delay(1500)
         const code = await nix.requestPairingCode(myPhoneNumber)
         console.log('pairing code:', code)
      }
      else if (connection === 'close') {
         const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
         console.log('connection closed:', lastDisconnect.error, 'reconnect:', shouldReconnect)
         if (shouldReconnect) {
            connectToWhatsApp()
         }
      }
      else if (connection === 'open') {
         console.log('connected to WhatsApp')
      }
   })

   nix.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
         if (!message.message) continue

         console.log('incoming message:', message)
         await nix.sendMessage(message.key.remoteJid, {
            text: 'hello from nix408'
         })
      }
   })
}

connectToWhatsApp()
```

#### Auth State

> [!NOTE]
> You can use the experimental useSingleFileAuthState and useSqliteAuthState as an alternative to useMultiFileAuthState. However, useSingleFileAuthState already includes an internal caching mechanism, so there is no need to wrap state.keys with makeCacheableSignalKeyStore.

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Data store

> [!CAUTION]
> I highly recommend building your own data store, as keeping an entire chat history in memory can lead to excessive RAM usage.

```javascript
import { makeWASocket, makeInMemoryStore, delay, DisconnectReason, useMultiFileAuthState } from 'nix408'
import { Boom } from '@hapi/boom'
import pino from 'pino'

const myPhoneNumber = '6288888888888'

// --- Create your store path
const storePath = './store.json'

const logger = pino({ level: 'silent' })

const connectToWhatsApp = async () => {
   const { state, saveCreds } = await useMultiFileAuthState('session')
    
   const nix = makeWASocket({
      logger,
      auth: state
   })

   const store = makeInMemoryStore({
      logger,
      socket: nix
   })

   store.bind(nix.ev)

   nix.ev.on('creds.update', saveCreds)

   nix.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'connecting' && !nix.authState.creds.registered) {
         await delay(1500)
         const code = await nix.requestPairingCode(myPhoneNumber)
         console.log('pairing code:', code)
      }
      else if (connection === 'close') {
         const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
         console.log('connection closed:', lastDisconnect.error, 'reconnect:', shouldReconnect)
         if (shouldReconnect) {
            connectToWhatsApp()
         }
      }
      else if (connection === 'open') {
         console.log('connected to WhatsApp')
      }
   })

   nix.ev.on('chats.upsert', () => {
      console.log('chats:', store.chats.all())
   })

   nix.ev.on('contacts.upsert', () => {
      console.log('contacts:', Object.values(store.contacts))
   })

   // --- Read store from file
   store.readFromFile(storePath)

   // --- Save store every 3 minutes
   setInterval(() => {
      store.writeToFile(storePath)
   }, 180000)
}

connectToWhatsApp()
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### WhatsApp IDs

`id` is the WhatsApp ID, called `jid` and `lid` too, of the person or group you're sending the message to.
- It must be in the format `[country code][phone number]@s.whatsapp.net`
   - Example for people: `19999999999@s.whatsapp.net` and `12699999999@lid`.
   - For groups, it must be in the format `123456789-123345@g.us`.
- For Meta AI, it's `11111111111@bot`.
- For broadcast lists, it's `[timestamp of creation]@broadcast`.
- For stories, the ID is `status@broadcast`.

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Sending messages

> [!NOTE]
> You can get the jid from message.key.remoteJid in the first example.

#### Text

```javascript
// --- Send a regular text message
nix.sendMessage(jid, {
   text: 'hello'
}, {
   quoted: message
})

// --- Send a text message with a link preview
const urlA = 'https://github.com/marrspace/nix408'

nix.sendMessage(jid, {
   text: urlA + ' — check it out',
   linkPreview: {
      'matched-text': urlA,
      title: 'nix408',
      description: 'WhatsApp Web automation',
      previewType: 0, // --- Use 1 for video playback in the link preview
      jpegThumbnail: fs.readFileSync('./path/to/image.jpg')
   }
})

// --- Send a text message with a large link preview and favicon
import { prepareWAMessageMedia } from 'nix408'

const urlB = 'https://github.com/marrspace/nix408#readme'

const { imageMessage: image } = await prepareWAMessageMedia({
   image: {
      url: './path/to/image.jpg'
   }
}, {
   upload: nix.waUploadToServer,
   mediaTypeOverride: 'thumbnail-link'
})

// --- Set the thumbnail display size
image.height = 720
image.width = 480

nix.sendMessage(jid, {
   text: urlB + ' — check it out',
   linkPreview: {
      'matched-text': urlB,
      title: 'nix408',
      description: 'WhatsApp Web automation',
      previewType: 0,
      jpegThumbnail: fs.readFileSync('./path/to/image.jpg'),
      highQualityThumbnail: image,
      linkPreviewMetadata: {
         linkMediaDuration: 0, // --- Duration in seconds (for video/audio content)
         socialMediaPostType: 1, // --- Enum: 0 = NONE, 1 = REEL, 2 = LIVE_VIDEO, 3 = LONG_VIDEO, 4 = SINGLE_IMAGE, 5 = CAROUSEL
      } // --- Additional metadata for large link preview
   },
   favicon: {
      url: './path/to/tiny-image.ico'
   }
})
```

#### Mention

```javascript
// --- Regular mention
nix.sendMessage(jid, {
   text: 'hi @628123456789',
   mentions: ['628123456789@s.whatsapp.net']
}, {
   quoted: message
})

// --- Mention all
nix.sendMessage(jid, {
   text: 'hi @all',
   mentionAll: true
}, {
   quoted: message
})
```

#### Reaction

```javascript
nix.sendMessage(jid, {
   react: {
      key: message.key,
      text: '👍'
   }
})
```

#### Pin Message

```javascript
nix.sendMessage(jid, {
   pin: message.key,
   time: 86400, // --- Set the value in seconds: 86400 (1d), 604800 (7d), or 2592000 (30d)
   type: 1 // --- Or 2 to remove
})
```

#### Keep Chat

> [!NOTE]
> Keep Chat can only be used in chats or groups with disappearing messages enabled.

```javascript
nix.sendMessage(jid, {
   keep: message.key,
   type: 1 // --- Or 2 to remove
})
```

#### Forward Message

```javascript
nix.sendMessage(jid, {
   forward: message,
   force: true // --- Optional
})
```

#### Contact

```javascript
const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + 'FN:nix408\n'
            + 'ORG:nix408;\n'
            + 'TEL;type=CELL;type=VOICE;waid=628123456789:+62 8123 4567 89\n'
            + 'END:VCARD'

nix.sendMessage(jid, {
   contacts: {
      displayName: 'nix408',
      contacts: [
         { vcard }
      ]
   }
}, {
   quoted: message
})
```

#### Location

```javascript
nix.sendMessage(jid, {
   location: {
      degreesLatitude: 24.121231,
      degreesLongitude: 55.1121221,
      name: 'office'
   }
}, {
   quoted: message
})
```

#### Event

```javascript
nix.sendMessage(jid, {
   event: {
      name: 'Community meetup',
      description: 'Monthly community meetup. Bring your questions.',
      call: 'audio', // --- Or "video", this field is optional
      startDate: new Date(Date.now() + 3600000),
      endDate: new Date(Date.now() + 28800000),
      isCancelled: false, // --- Optional
      isScheduleCall: false, // --- Optional
      extraGuestsAllowed: false, // --- Optional
      location: {
         name: 'Jakarta',
         degreesLatitude: -6.2,
         degreesLongitude: 106.8
      }
   }
}, {
   quoted: message
})
```

#### Group Invite

```javascript
const inviteCode = groupUrl
   .split('chat.whatsapp.com/')[1]
   ?.split('?')[0]

const groupJid = '1201111111111@g.us'
const groupName = 'nix408'

nix.sendMessage(jid, {
   groupInvite: {
      inviteCode,
      inviteExpiration: Date.now() + 86400000,
      text: 'join our group',
      jid: groupJid,
      subject: groupName,
   }
}, {
   quoted: message
})
```

#### Product

```javascript
import { randomUUID } from 'crypto'

nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   body: 'New in the store',
   footer: 'nix408',
   product: {
      currencyCode: 'IDR',
      description: 'Premium plan, lifetime access',
      priceAmount1000: 70_000_000,
      productId: randomUUID(),
      productImageCount: 1,
      salePriceAmount1000: 65_000_000,
      signedUrl: 'https://github.com/marrspace/nix408',
      title: 'Pro plan',
      url: 'https://github.com/marrspace/nix408'
   },
   businessOwnerJid: '0@s.whatsapp.net'
})
```

#### Poll

```javascript
// --- Regular poll message
nix.sendMessage(jid, {
   poll: {
      name: 'Deploy today?',
      values: ['Yes', 'No'],
      selectableCount: 1,
      toAnnouncementGroup: false,
      endDate: new Date(Date.now() + 28800000), // --- Optional
      hideVoter: false, // --- Optional
      canAddOption: false // --- Optional
   }
}, {
   quoted: message
})

// --- Quiz (only for newsletter)
nix.sendMessage('1211111111111@newsletter', {
   poll: {
      name: 'Quick quiz',
      values: ['Yes', 'No'],
      correctAnswer: 'Yes',
      pollType: 1
   }
}, {
   quoted: message
})

// --- Poll result
nix.sendMessage(jid, {
   pollResult: {
      name: 'Poll results',
      votes: [{
         name: 'Nice',
         voteCount: 10
      }, {
         name: 'Nah',
         voteCount: 2
      }],
      pollType: 0 // Or 1 for quiz
   }
}, {
   quoted: message
})

// --- Poll update
nix.sendMessage(jid, {
   pollUpdate: {
      metadata: {},
      key: message.key,
      vote: {
         enclv: /* <Buffer> */,
         encPayload: /* <Buffer> */
      }
   }
}, {
   quoted: message
})
```

#### Button Response

```javascript
// --- Using buttonsResponseMessage
nix.sendMessage(jid, {
   type: 'plain',
   buttonReply: {
      id: '#Menu',
      displayText: 'Open menu'
   }
}, {
   quoted: message
})

// --- Using interactiveResponseMessage
nix.sendMessage(jid, {
   flowReply: {
      format: 0,
      text: 'reply',
      name: 'menu_options',
      paramsJson: JSON.stringify({
         id: '#Menu',
         description: 'Open menu'
      })
   }
}, {
   quoted: message
})

// --- Using listResponseMessage
nix.sendMessage(jid, {
   listReply: {
      title: 'See more',
      description: 'Open menu',
      id: '#Menu'
   }
}, {
   quoted: message
})

// --- Using templateButtonReplyMessage
nix.sendMessage(jid, {
   type: 'template',
   buttonReply: {
      id: '#Menu',
      displayText: 'Open menu',
      index: 1
   }
}, {
   quoted: message
})
```

#### AI Rich messages

`richResponse` builds a `richResponseMessage`, the structured reply format WhatsApp uses for
AI answers. It renders on WhatsApp Web, Desktop and iOS. On Android it shows in channels only,
for now.

You pass an array of submessages and nix408 wraps each one in the right proto type. The order
of the array is the order on screen.

| Submessage field | Renders as |
| --- | --- |
| `text` | A paragraph |
| `code` + `language` | A syntax-highlighted code block |
| `table` + `title` | A table with an optional heading row |
| `links` | Text with inline citation sources |
| `inlineImage` | An image inside the reply |
| `latex` | A LaTeX expression |
| `items` | A carousel of content items |

`disclaimerText` sets the small print under the message. `headerText`, `contentText` and
`footerText` are shortcuts for a plain header, body and footer when you do not need the full
array.

##### Code block (with HTML)

Pass the code as a string and nix408 tokenizes it for you. Any language in the table at the
bottom of this section works, `html` included.

```javascript
nix.sendMessage(jid, {
   disclaimerText: 'Rendered by nix408',
   headerText: 'A small HTML page',
   contentText: '---',
   language: 'html',
   code: `<section class="card">
  <h1>nix408</h1>
  <p>WhatsApp Web automation for Node.js.</p>
</section>`
})
```

If you already have tokens, pass them yourself instead of a string:

```javascript
import { tokenizeCode } from 'nix408'

const language = 'html'
const code = '<p>Hello</p>'

nix.sendMessage(jid, {
   disclaimerText: 'Tokenized by hand',
   richResponse: [{
      text: 'Markup below'
   }, {
      language,
      code: tokenizeCode(code, language)
   }]
})
```

##### Table

A table is an array of rows. The first row is the heading unless you set `noHeading: true`.
Every row is an array of cells, and every row should have the same number of cells.

```javascript
nix.sendMessage(jid, {
   disclaimerText: 'Rendered by nix408',
   headerText: '## Runtime comparison',
   contentText: '---',
   title: 'Node.js, Bun and Deno',
   table: [
      ['', 'Node.js', 'Bun', 'Deno'],
      ['Engine', 'V8', 'JavaScriptCore', 'V8'],
      ['Startup', 'slow', 'fast', 'fast'],
      ['npm support', 'yes', 'yes', 'partial']
   ],
   noHeading: false, // --- Optional, set true to render every row as data
   footerText: 'Source: project docs'
})
```

##### Full example: text, code, table and citations in one reply

```javascript
nix.sendMessage(jid, {
   disclaimerText: 'Rendered by nix408',
   richResponse: [{
      text: 'Here is the short version.'
   }, {
      text: 'Runtime comparison'
   }, {
      title: 'Node.js, Bun and Deno',
      table: [
         ['', 'Node.js', 'Bun', 'Deno'],
         ['Engine', 'V8', 'JavaScriptCore', 'V8'],
         ['Startup', 'slow', 'fast', 'fast']
      ]
   }, {
      text: 'A config file in JSON'
   }, {
      language: 'json',
      code: [{ highlightType: 0, codeContent: '{ "port": 3000 }' }]
   }, {
      text: 'Sources',
      links: [{
         text: 'Node.js docs',
         title: 'Node.js',
         url: 'https://nodejs.org/'
      }, {
         text: 'Bun docs',
         title: 'Bun',
         url: 'https://bun.sh/'
      }]
   }]
})
```

##### Supported languages

`tokenizeCode` ships keyword sets for these languages:

```
css  html  javascript  typescript  python  golang  rust
c  c#  c++  bash  bat  powershell
```

#### Status Mention

```javascript
nix.sendMessage([jidA, jidB, jidC], {
   text: 'status update'
})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Sending media

> [!NOTE]
> For media messages, you can pass a Buffer directly, or an object with either { stream: Readable } or { url: string } (local file path or HTTP/HTTPS URL).

#### Image

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'A cover shot'
}, {
   quoted: message
})
```

#### Video

```javascript
nix.sendMessage(jid, {
   video: {
      url: './path/to/video.mp4'
   },
   gifPlayback: false, // --- Set true if you want to send video as GIF
   ptv: false,  // --- Set true if you want to send video as PTV
   caption: 'A cover shot'
}, {
   quoted: message
})
```

#### Sticker

```javascript
nix.sendMessage(jid, {
   sticker: {
      url: './path/to/sticker.webp'
   }
}, {
   quoted: message
})
```

#### Audio

```javascript
nix.sendMessage(jid, {
   audio: {
      url: './path/to/audio.mp3'
   },
   ptt: false // --- Set true if you want to send audio as Voice Note
}, {
   quoted: message
})
```

#### Document

```javascript
nix.sendMessage(jid, {
   document: {
      url: './path/to/document.pdf'
   },
   mimetype: 'application/pdf',
   caption: 'report.pdf'
}, {
   quoted: message
})
```

#### Album (Image & Video)

```javascript
nix.sendMessage(jid, {
   album: [{
      image: {
         url: './path/to/image.jpg'
      },
      caption: '1st image'
   }, {
      video: {
         url: './path/to/video.mp4'
      },
      caption: '1st video'
   }, {
      image: {
         url: './path/to/image.jpg'
      },
      caption: '2nd image'
   }, {
      video: {
         url: './path/to/video.mp4'
      },
      caption: '2nd video'
   }]
}, {
   quoted: message
})
```

#### Sticker Pack

> [!IMPORTANT]
> If sharp or @napi-rs/image is not installed, the cover and stickers must already be in WebP format.

```javascript
nix.sendMessage(jid, {
   cover: {
      url: './path/to/image.webp'
   },
   stickers: [{
      data: {
         url: './path/to/image.webp'
      }
   }, {
      data: {
         url: './path/to/image.webp'
      }
   }, {
      data: {
         url: './path/to/image.webp'
      }
   }],
   name: 'My sticker pack',
   publisher: 'nix408',
   description: 'nix408'
}, {
   quoted: message
})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Interactive messages

#### Buttons

```javascript
// --- Regular buttons message
nix.sendMessage(jid, {
   text: 'Pick an option',
   footer: 'nix408',
   buttons: [{
      text: 'Sign up',
      id: '#SignUp'
   }]
}, {
   quoted: message
})

// --- Buttons with Media & Native Flow
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Options below',
   footer: 'nix408',
   buttons: [{
      text: 'Rate us',
      id: '#Rating'
   }, {
      text: 'Select',
      sections: [{
         title: 'Section one',
         rows: [{
            header: '',
            title: 'Secret ingredient',
            description: '',
            id: '#SecretIngredient'
         }]
      }, {
         title: 'Section two',
         highlight_label: 'Popular',
         rows: [{
            header: '',
            title: 'Coupon',
            description: '',
            id: '#CouponCode'
         }]
      }]
   }]
}, {
   quoted: message
})
```

#### List

> [!NOTE]
> It only works in private chat (@s.whatsapp.net).

```javascript
nix.sendMessage(jid, {
   text: 'Choose a category',
   footer: 'nix408',
   buttonText: 'Select',
   title: 'Menu',
   sections: [{
      title: 'Main',
      rows: [{
         title: 'Ask AI',
         description: '',
         rowId: '#AI'
      }]
   }, {
      title: 'Tools',
      rows: [{
         title: 'Search',
         description: '',
         rowId: '#Search'
      }]
   }]
}, {
   quoted: message
})
```

#### Interactive

```javascript
// --- Native Flow
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Interactive message',
   footer: 'nix408',
   optionText: 'Select an option', // --- Optional, wrap all native flow into a single list
   optionTitle: 'Options', // --- Optional
   offerText: 'New coupon', // --- Optional, add an offer into message
   offerCode: 'nix408', // --- Optional
   offerUrl: 'https://github.com/marrspace/nix408', // --- Optional
   offerExpiration: Date.now() + 3_600_000, // --- Optional
   nativeFlow: [{
      text: 'Say hi',
      id: '#Greeting',
      icon: 'review' // --- Optional
   }, {
      text: 'Call us',
      call: '628123456789'
   }, {
      text: 'Copy',
      copy: 'nix408'
   }, {
      text: 'Source',
      url: 'https://github.com/marrspace/nix408',
      useWebview: true // --- Optional
   }, {
      text: 'Select',
      sections: [{
         title: 'Section one',
         rows: [{
            header: '',
            title: 'Coupon',
            description: '',
            id: '#CouponCode'
         }]
      }, {
         title: 'Section two',
         highlight_label: 'Popular',
         rows: [{
            header: '',
            title: 'Secret ingredient',
            description: '',
            id: '#SecretIngredient'
         }]
      }],
      icon: 'default' // --- Optional
   }],
   interactiveAsTemplate: false, // --- Optional, wrap the interactive message into a template
}, {
   quoted: message
})

// --- Carousel & Native Flow
nix.sendMessage(jid, {
   text: 'Carousel',
   footer: 'nix408',
   cards: [{
      image: {
         url: './path/to/image.jpg'
      },
      caption: 'Image 1',
      footer: 'Gallery',
      nativeFlow: [{
         text: 'Source',
         url: 'https://github.com/marrspace/nix408',
         useWebview: true
      }]
   }, {
      image: {
         url: './path/to/image.jpg'
      },
      caption: 'Image 2',
      footer: 'Gallery',
      offerText: 'New coupon',
      offerCode: 'nix408',
      offerUrl: 'https://github.com/marrspace/nix408',
      offerExpiration: Date.now() + 3_600_000,
      nativeFlow: [{
         text: 'Source',
         url: 'https://github.com/marrspace/nix408'
      }]
   }, {
      image: {
         url: './path/to/image.jpg'
      },
      caption: 'Image 3',
      footer: 'Gallery',
      optionText: 'Select an option',
      optionTitle: 'Options',
      offerText: 'New coupon',
      offerCode: 'nix408',
      offerUrl: 'https://github.com/marrspace/nix408',
      offerExpiration: Date.now() + 3_600_000,
      nativeFlow: [{
         text: 'Product',
         id: '#Product',
         icon: 'default'
      }, {
         text: 'Source',
         url: 'https://github.com/marrspace/nix408'
      }]
   }]
}, {
   quoted: message
})

// --- Native Flow with Audio in the Footer
nix.sendMessage(jid, {
   text: 'Music in the footer',
   audioFooter: {
      url: './path/to/audio.mp3'
   }, // --- Like other media upload methods, buffers and streams are supported
   nativeFlow: [{
      text: 'Good, next',
      id: '#Next',
      icon: 'review'
   }, {
      text: 'Skip',
      id: '#Skip',
      icon: 'default'
   }]
}, {
   quoted: message
})
```

#### Hydrated Template

```javascript
nix.sendMessage(jid, {
   title: 'Menu',
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Template message',
   footer: 'nix408',
   templateButtons: [{
      text: 'Tap here',
      id: '#Order'
   }, {
      text: 'Source',
      url: 'https://github.com/marrspace/nix408'
   }, {
      text: 'Call us',
      call: '628123456789'
   }]
}, {
   quoted: message
})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Payment messages

#### Invite Payment

```javascript
nix.sendMessage(jid, {
   paymentInviteServiceType: 3 // 1, 2, or 3
})
```

#### Invoice

> [!NOTE]
> Invoice message are not supported yet.

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   invoiceNote: 'Invoice #1042'
})
```

#### Order

```javascript
nix.sendMessage(chat, {
   orderText: 'Order #1042',
   thumbnail: fs.readFileSync('./path/to/image.jpg') // --- Must in buffer format
}, {
   quoted: message
})
```

#### Request Payment

```javascript
nix.sendMessage(jid, {
   text: 'Payment request',
   requestPaymentFrom: '0@s.whatsapp.net'
})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Message options

#### AI Icon

> [!NOTE]
> It only works in private chat (@s.whatsapp.net).

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Sent with the AI icon',
   ai: true
}, {
   quoted: message
})
```

#### Ephemeral

> [!NOTE]
> Wrap message into ephemeralMessage

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Disappearing message',
   ephemeral: true
})
```

#### External Ad Reply

> [!NOTE]
> Add an ad thumbnail to messages (may not be displayed on some WhatsApp versions).

```javascript
nix.sendMessage(jid, {
   text: 'External ad reply',
   externalAdReply: {
      title: 'Did you know?',
      body: 'A short fact goes here',
      thumbnail: fs.readFileSync('./path/to/image.jpg'), // --- Must in buffer format
      largeThumbnail: false, // --- Or true for bigger thumbnail
      url: 'https://github.com/marrspace/nix408' // --- Optional, used for WhatsApp internal thumbnail caching and direct URL
   }
}, {
   quoted: message
})
```

#### Group Status

> [!NOTE]
> It only works in group chat (@g.us)

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Group status',
   groupStatus: true
})
```

#### Lottie Sticker

> [!NOTE]
> Wrap message into lottieStickerMessage

```javascript
nix.sendMessage(jid, {
   sticker: {
      url: './path/to/sticker.webp'
   },
   isLottie: true
})
```

#### Raw

```javascript
nix.sendMessage(jid, {
   extendedTextMessage: {
      text: 'Built by hand from the raw WhatsApp proto structure',
      contextInfo: {
         externalAdReply: {
            title: 'nix408',
            thumbnail: fs.readFileSync('./path/to/image.jpg'),
            sourceApp: 'whatsapp',
            showAdAttribution: true,
            mediaType: 1
         }
      }
   },
   raw: true
}, {
   quoted: message
})
```

#### Secure Meta Service Label

```javascript
nix.sendMessage(jid, {
   text: 'Service label',
   secureMetaServiceLabel: true
})
```

#### Spoiler

> [!NOTE]
> Wrap message into spoilerMessage

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'Tap to reveal',
   spoiler: true
})
```

#### View Once

> [!NOTE]
> Wrap message into viewOnceMessage

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'View once',
   viewOnce: true
})
```

#### View Once V2

> [!NOTE]
> Wrap message into viewOnceMessageV2

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'View once (V2)',
   viewOnceV2: true
})
```

#### View Once V2 Extension

> [!NOTE]
> Wrap message into viewOnceMessageV2Extension

```javascript
nix.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: 'View once (V2 extension)',
   viewOnceV2Extension: true
})
```

#### View Once V2 (text only)

The flags above wrap whatever you send. If you only want disappearing text and nothing else,
`prepareViewOnceV2Text` builds the raw shape for you:

```javascript
import { prepareViewOnceV2Text } from 'nix408/Utils'

await nix.relayMessage(jid, prepareViewOnceV2Text('this text disappears once opened'), {})
```

`sendMessage(jid, { text: '...', viewOnceV2: true })` does the same thing. Use the helper when you
need the raw message object.

### Experimental features

> [!WARNING]
> Everything in this section is reverse-engineered and undocumented. WhatsApp can change or remove
> it without notice. Test before you ship, and do not build anything critical on top of it.

These helpers return a message object. Pass it straight to `sendMessage` (the key below) or to
`relayMessage` if you want to skip the builder.

#### AI Rich: raw HTML

Renders arbitrary HTML inside an AI Rich reply. WhatsApp shows it as a card with the HTML payload,
plus source chips for the domains you list in `trustedSources`.

```javascript
nix.sendMessage(jid, {
   aiRichHtml: {
      html: '<section class="card"><h1>Status</h1><p>All systems up.</p></section>',
      trustedSources: ['marrlabs.my.id'],
      headerText: 'Bot status',
      contentText: 'Rendered inside an AI Rich reply.',
      disclaimerText: 'Generated by nix408',
      footerText: 'Updated just now'
   }
})
```

| Option | What it does |
| --- | --- |
| `html` | The HTML string rendered in the `GenAIaeacdsnwHtmlPrimitive` payload |
| `trustedSources` | Domains shown as source chips |
| `headerText` / `contentText` / `footerText` | Plain text submessages around the card |
| `disclaimerText` | Small print under the message |
| `responseId` | Fixed response id; a UUID is generated when omitted |

You can also call the builder directly:

```javascript
import { prepareAiRichHtml } from 'nix408/Utils'

const message = prepareAiRichHtml({ html: '<p>hi</p>' })
await nix.relayMessage(jid, message, {})
```

#### AI Rich: image grid and entity card

A grid of images with an optional profile card underneath. Each image becomes a
`GenAIImaginePrimitive` section; the entity becomes a `GenAICompactEntityPrimitive`.

```javascript
nix.sendMessage(jid, {
   aiRichGrid: {
      images: [{
         url: 'https://example.com/banner.png',
         width: 1080,
         height: 369
      }],
      entity: {
         title: 'M. Rafel Pratama',
         subtitle: 'Owner Bot',
         secondarySubtitle: 'Developer of Nex-Core Official',
         entityId: 867051314767696,
         entityUrl: 'https://wa.me/6287737937323',
         isVerified: true,
         imageUrl: 'https://example.com/avatar.jpg'
      },
      contentText: 'Meet the team.',
      disclaimerText: 'Generated by nix408'
   }
})
```

#### Bloks widget (A2UI)

An interactive message that renders an A2UI surface. `buildA2UISurface` turns a list of cards into
the `createSurface` payload, and `prepareBloksWidget` wraps it as a `bloksWidget` of type `im_a2ui`.

```javascript
import { buildA2UISurface, prepareBloksWidget } from 'nix408/Utils'

const surface = buildA2UISurface({
   cards: [
      {
         image: 'https://example.com/luna.jpg',
         title: 'Monitor',
         lines: [{ text: 'Uptime 3h 31m' }]
      },
      {
         title: 'BOT INFORMATION',
         lines: [
            { text: 'Latency: 0.0011 ms' },
            { text: 'Mode: Self' },
            { text: 'Users: 468' }
         ]
      }
   ]
})

await nix.relayMessage(jid, prepareBloksWidget({
   surface,
   bodyText: '',
   footerText: 'nix408',
   expiration: 7776000
}), {})
```

Or through `sendMessage` with the raw surface:

```javascript
nix.sendMessage(jid, {
   bloksWidget: {
      surface: buildA2UISurface({ cards: [{ title: 'Status', lines: [{ text: 'ok' }] }] }),
      footerText: 'nix408'
   }
})
```

A card is built from `image` (optional), `title` (optional) and `lines`. Each card becomes a
`Card` wrapping a `Column`, and every card is stacked under one root `Column`. Pass `data` instead
of `surface` when you already have the JSON string.

#### Raw experimental messages

Every helper above is a thin wrapper over `relayMessage`. If you would rather send the object
yourself, the `raw: true` flag on `sendMessage` skips the builder entirely:

```javascript
await nix.relayMessage(jid, {
   stickerPackMessage: { /* ... */ }
}, {})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### Modifying messages

#### Delete Messages

```javascript
nix.sendMessage(jid, {
   delete: message.key
})
```

#### Edit Messages

```javascript
// --- Edit plain text
nix.sendMessage(jid, {
   text: 'edited: fixed the typo',
   edit: message.key
})

// --- Edit media messages caption
nix.sendMessage(jid, {
   caption: 'edited caption',
   edit: message.key
})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

### API reference

#### Find User ID (JID|PN/LID)

> [!NOTE]
> The ID must contain numbers only (no +, (), or -) and must include the country code with WhatsApp ID format.

```javascript
// --- PN (Phone Number)
const phoneNumber = '6281111111111@s.whatsapp.net'

const ids = await nix.findUserId(phoneNumber)

console.log('user id:', ids)

// --- LID (Local Identifier)
const lid = '43411111111111@lid'

const ids = await nix.findUserId(lid)

console.log('user id:', ids)

// --- Output
// {
//    phoneNumber: '6281111111111@s.whatsapp.net',
//    lid: '43411111111111@lid'
// }
// --- Output when failed
// {
//    phoneNumber: '6281111111111@s.whatsapp.net',
//    lid: undefined
// }
// --- Same output shape regardless of input type
```

#### Request Custom Pairing Code

> [!NOTE]
> The phone number must contain numbers only (no +, (), or -) and must include the country code.

```javascript
const phoneNumber = '6281111111111'
const customPairingCode = 'STARFALL'

await nix.requestPairingCode(phoneNumber, customPairingCode)

console.log('pairing code:', customPairingCode)
```

#### Image Processing

> [!NOTE]
> Automatically use available image processing library: sharp, @napi-rs/image, or jimp

```javascript
import { getImageProcessingLibrary } from 'nix408'
import { readFile } from 'fs/promises'

const lib = await getImageProcessingLibrary()

const bufferOrFilePath = './path/to/image.jpg'
const width = 512

let output

// --- If sharp installed
if (lib.sharp?.default) {
   const img = lib.sharp.default(bufferOrFilePath)

   output = await img.resize(width)
      .jpeg({ quality: 80 })
      .toBuffer()
}

// --- If @napi-rs/image installed
else if (lib.image?.Transformer) {
   // --- Must in buffer format
   const inputBuffer = Buffer.isBuffer(bufferOrFilePath)
      ? bufferOrFilePath
      : await readFile(bufferOrFilePath)

   const img = new lib.image.Transformer(inputBuffer)

   output = await img.resize(width, undefined, 0)
      .jpeg(50)
}

// --- If jimp installed
else if (lib.jimp?.Jimp) {
   const img = await lib.jimp.Jimp.read(bufferOrFilePath)

   output = await img
      .resize({ w: width, mode: lib.jimp.ResizeStrategy.BILINEAR })
      .getBuffer('image/jpeg', { quality: 50 })
}

// --- Fallback
else {
   throw new Error('No image processing available')
}

console.log('done')
console.dir(output, { depth: null })
```

#### Newsletter Management

```javascript
// --- Create a new one
nix.newsletterCreate('nix408', 'Release notes and updates')

// --- Get info
const metadata = nix.newsletterMetadata('1231111111111@newsletter')
console.dir(metadata, { depth: null })

// --- Get subscribers count
const subscribers = await nix.newsletterSubscribers('1231111111111@newsletter')
console.dir(subscribers, { depth: null })

// --- Follow and Unfollow
nix.newsletterFollow('1231111111111@newsletter')
nix.newsletterUnfollow('1231111111111@newsletter')

// --- Mute and Unmute
nix.newsletterMute('1231111111111@newsletter')
nix.newsletterUnmute('1231111111111@newsletter')

// --- Demote admin
nix.newsletterDemote('1231111111111@newsletter', '6281111111111@s.whatsapp.net')

// --- Change owner
nix.newsletterChangeOwner('1231111111111@newsletter', '6281111111111@s.whatsapp.net')

// --- Update newsletter
nix.newsletterUpdate('1231111111111@newsletter', { name: 'nix408' })

// --- Change name
nix.newsletterUpdateName('1231111111111@newsletter', 'nix408')

// --- Change description
nix.newsletterUpdateDescription('1231111111111@newsletter', 'Release notes and updates')

// --- Change photo
nix.newsletterUpdatePicture('1231111111111@newsletter', {
   url: 'path/to/image.jpg'
})

// --- Remove photo
nix.newsletterRemovePicture('1231111111111@newsletter')

// --- React to a message
nix.newsletterReactMessage('1231111111111@newsletter', '100', '❤️')

// --- Get admin count
const count = await nix.newsletterAdminCount('1231111111111@newsletter')

// --- Get all subscribed newsletters
const newsletters = await nix.newsletterSubscribed()
console.dir(newsletters, { depth: null })

// --- Fetch newsletter messages
const messages = nix.newsletterFetchMessages('jid', '1231111111111@newsletter', 50, 0, 0)
console.dir(messages, { depth: null })

// --- Delete newsletter
nix.newsletterDelete('1231111111111@newsletter')
```

#### Group Management

```javascript
// --- Create a new one and add participants using their JIDs
const group = nix.groupCreate('nix408', ['628123456789@s.whatsapp.net'])
console.dir(group, { depth: null })

// --- Get info
const metadata = await nix.groupMetadata(jid)
console.dir(metadata, { depth: null })

// --- Get group invite code
const inviteCode = await nix.groupInviteCode(jid)
console.dir(inviteCode, { depth: null })


// --- Revoke invite link
nix.groupRevokeInvite(jid)

// --- Accept group invite
nix.groupAcceptInvite(inviteCode)

// --- Leave group
nix.groupLeave(jid)

// --- Add participants
nix.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'add')

// --- Remove participants
nix.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'remove')

// --- Promote to admin
nix.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'promote')

// --- Demote from admin
nix.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'demote')

// --- Accept join requests
nix.groupRequestParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'approve')

// --- Change name
nix.groupUpdateSubject(jid, 'nix408')

// --- Change description
nix.groupUpdateDescription(jid, 'Updated description')

// --- Change photo
nix.updateProfilePicture(jid, {
   url: 'path/to/image.jpg'
})

// --- Remove photo
nix.removeProfilePicture(jid)

// --- Set group as admin only for chatting
nix.groupSettingUpdate(jid, 'announcement')

// --- Set group as open to all for chatting
nix.groupSettingUpdate(jid, 'not_announcement')

// --- Set admin only can edit group info
nix.groupSettingUpdate(jid, 'locked')

// --- Set all participants can edit group info
nix.groupSettingUpdate(jid, 'unlocked')

// --- Set admin only can add participants
nix.groupMemberAddMode(jid, 'admin_add')

// --- Set all participants can add participants
nix.groupMemberAddMode(jid, 'all_member_add')

// --- Enable or disable temporary messages with seconds format
nix.groupToggleEphemeral(jid, 86400)

// --- Disable temporary messages
nix.groupToggleEphemeral(jid, 0)

// --- Enable or disable membership approval mode
nix.groupJoinApprovalMode(jid, 'on')
nix.groupJoinApprovalMode(jid, 'off')

// --- Get all groups metadata
const groups = await nix.groupFetchAllParticipating()
console.dir(groups, { depth: null })

// --- Get pending join requests
const requests = await nix.groupRequestParticipantsList(jid)
console.dir(requests, { depth: null })

// --- Get group info from link
const group = await nix.groupGetInviteInfo('ABC123456789')
console.log('group info:', group)

// --- Update bot member label
nix.updateMemberLabel(jid, 'nix408')
```

#### Community Management

```javascript
// --- Create a new one and add description
const community = await nix.communityCreate('nix408', 'Release notes and updates')
console.dir(community, { depth: null })

// --- Create a subgroup for community and add participants using their JIDs
const group = await nix.communityCreateGroup('Announcements', ['628123456789@s.whatsapp.net'], communityJid)

// --- Link an existing group
nix.communityLinkGroup(groupJid, communityJid)

// --- Unlink an existing group
nix.communityUnlinkGroup(groupJid, communityJid)

// --- Get info
const metadata = await nix.communityMetadata(jid)
console.dir(metadata, { depth: null })

// --- Get community invite code
const inviteCode = await nix.communityInviteCode(jid)
console.dir(inviteCode, { depth: null })

// --- Revoke invite link
nix.communityRevokeInvite(jid)

// --- Accept community invite
nix.communityAcceptInvite(inviteCode)

// --- Leave community
nix.communityLeave(jid)

// --- Accept join requests
nix.communityRequestParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'approve')

// --- Change name
nix.communityUpdateSubject(jid, 'nix408')

// --- Change description
nix.communityUpdateDescription(jid, 'Updated description')

// --- Set community as admin only for chatting
nix.communitySettingUpdate(jid, 'announcement')

// --- Set community as open to all for chatting
nix.communitySettingUpdate(jid, 'not_announcement')

// --- Set admin only can edit community info
nix.communitySettingUpdate(jid, 'locked')

// --- Set all participants can edit community info
nix.communitySettingUpdate(jid, 'unlocked')

// --- Set admin only can add participants
nix.communityMemberAddMode(jid, 'admin_add')

// --- Set all participants can add participants
nix.communityMemberAddMode(jid, 'all_member_add')

// --- Enable or disable temporary messages with seconds format
nix.communityToggleEphemeral(jid, 86400)

// --- Disable temporary messages
nix.communityToggleEphemeral(jid, 0)

// --- Enable or disable membership approval mode
nix.communityJoinApprovalMode(jid, 'on')
nix.communityJoinApprovalMode(jid, 'off')

// --- Get all communities metadata
const communities = await nix.communityFetchAllParticipating()
console.dir(communities, { depth: null })

// --- Get all community linked groups
const linked = await nix.communityFetchLinkedGroups(jid)
console.dir(linked, { depth: null })

// --- Get pending join requests
const requests = await nix.communityRequestParticipantsList(jid)
console.dir(requests, { depth: null })

// --- Get community info from link
const community = await nix.communityGetInviteInfo('ABC123456789')
console.log('community info:', community)
```

#### Profile Management

```javascript
// --- Get user profile picture
const url = await nix.profilePictureUrl(jid, 'image')
console.log('profile url:', url)

// --- Update profile picture
nix.updateProfilePicture(jid, buffer)
nix.updateProfilePicture(jid, { url })

// --- Remove profile picture
nix.removeProfilePicture(jid)

// --- Update profile name
nix.updateProfileName('My Name')

// --- Update profile status
nix.updateProfileStatus('Available')

// --- Presence
nix.sendPresenceUpdate('available', jid)
nix.presenceSubscribe(jid)

// --- Read receipts
nix.readMessages([message.key])
nix.sendReceipt(jid, participant, [messageId], 'read')

// --- Block user
nix.updateBlockStatus(jid, 'block')

// --- Unblock user
nix.updateBlockStatus(jid, 'unblock')

// --- Fetch blocklist
const blocked = await nix.fetchBlocklist()
console.dir(blocked, { depth: null })

// --- Modify chats
nix.chatModify({
   archive: true,
   lastMessageOrig: message,
   lastMessage: message
}, jid)

// --- Star messages
nix.star(jid, [{ id: messageId, fromMe: true }], true)

// --- Contact
nix.addOrEditContact(jid, { displayName: 'Pro plan' })
nix.removeContact(jid)

// --- Label
nix.addChatLabel(jid, labelId)
nix.removeChatLabel(jid, labelId)
nix.addMessageLabel(jid, messageId, labelId)

// --- App state sync
nix.resyncAppState(['regular', 'critical_block'], true)

// --- Get business profile
const profile = await nix.getBusinessProfile(jid)
console.dir(profile, { depth: null })
```

#### Business Management

```javascript
// --- Create a new product
const product = await nix.productCreate({
   name: 'Pro plan',
   description: 'Lifetime access to the pro plan',
   price: 100000,
   currency: 'IDR',
   originCountryCode: 'ID',
   images: [
      bufferImage,
      {
         url: './path/to/image.jpg'
      }
   ]
})
console.dir(product, { depth: null })

// --- Update product
await nix.productUpdate(productId, {
   name: 'Pro plan',
   description: 'Pro plan, now with more features',
   price: 75000,
   currency: 'IDR',
   images: [
      {
         url: './path/to/image.jpg'
      }
   ]
})

// --- Delete product
nix.productDelete([productId])

// --- Get catalog info
const { products, nextPageCursor } = await nix.getCatalog({
  jid: '628123456789@s.whatsapp.net',
  limit: 10
})

// --- Get collections
const collections = await nix.getCollections('628123456789@s.whatsapp.net', 10)
console.dir(collections, { depth: null })

// --- Get order info
const order = await nix.getOrderDetails(orderId, tokenBase64)
console.dir(order, { depth: null })

// --- Update business profile
await nix.updateBusinessProfile({
   address: 'Jakarta, Indonesia',
   description: 'Online store',
   websites: ['https://github.com/marrspace/nix408'],
   email: 'more-more@gmail.com',
   hours: {
      timezone: 'Asia/Jakarta',
      days: [{ day: 'mon', mode: 'open_24h' }]
   }
})

// --- Update cover
nix.updateCoverPhoto({
   url: './path/to/image.jpg'
})

// --- Remove cover
nix.removeCoverPhoto(coverId)

// --- Update quick replies
nix.addOrEditQuickReply({
  shortcut: 'hello',
  message: 'Hello from business account',
})

// --- Remove quick reply
nix.removeQuickReply(timestamp)
```

#### Privacy Management

```javascript
// --- Update last seen privacy
nix.updateLastSeenPrivacy('all')
nix.updateLastSeenPrivacy('contacts')
nix.updateLastSeenPrivacy('contact_blacklist')
nix.updateLastSeenPrivacy('nobody')

// --- Update online privacy
nix.updateOnlinePrivacy('all')
nix.updateOnlinePrivacy('match_last_seen')

// --- Update profile picture privacy
nix.updateProfilePicturePrivacy('contacts')

// --- Update status privacy
nix.updateStatusPrivacy('contacts')

// --- Update read receipts privacy
nix.updateReadReceiptsPrivacy('all')
nix.updateReadReceiptsPrivacy('none')

// --- Update groups add privacy
nix.updateGroupsAddPrivacy('all')
nix.updateGroupsAddPrivacy('contacts')

// --- Update messages privacy
nix.updateMessagesPrivacy('all')
nix.updateMessagesPrivacy('contacts')
nix.updateMessagesPrivacy('nobody')

// --- Update call privacy
nix.updateCallPrivacy('everyone')

// --- Update default disappearing mode
nix.updateDefaultDisappearingMode(86400)

// --- Update link previews privacy
nix.updateDisableLinkPreviewsPrivacy(true)
```

#### Events

```javascript
nix.ev.on('connection.update', async (update) => {})
nix.ev.on('creds.update', (update) => {})
nix.ev.on('messaging-history.set', (update) => {})
nix.ev.on('messaging-history.status', (update) => {})
nix.ev.on('chats.upsert', (update) => {})
nix.ev.on('chats.update', (update) => {})
nix.ev.on('chats.delete', (update) => {})
nix.ev.on('chats.lock', (update) => {})
nix.ev.on('lid-mapping.update', (update) => {})
nix.ev.on('presence.update', (update) => {})
nix.ev.on('contacts.upsert', (update) => {})
nix.ev.on('contacts.update', (update) => {})
nix.ev.on('messages.delete', (update) => {})
nix.ev.on('messages.update', (update) => {})
nix.ev.on('messages.media-update', (update) => {})
nix.ev.on('messages.upsert', (update) => {})
nix.ev.on('messages.reaction', (update) => {})
nix.ev.on('message-receipt.update', (update) => {})
nix.ev.on('groups.upsert', (update) => {})
nix.ev.on('groups.update', (update) => {})
nix.ev.on('group-participants.update', (update) => {})
nix.ev.on('group.join-request', (update) => {})
nix.ev.on('group.member-tag.update', (update) => {})
nix.ev.on('blocklist.set', (update) => {})
nix.ev.on('blocklist.update', (update) => {})
nix.ev.on('call', (update) => {})
nix.ev.on('labels.edit', (update) => {})
nix.ev.on('labels.association', (update) => {})
nix.ev.on('newsletter.reaction', (update) => {})
nix.ev.on('newsletter.view', (update) => {})
nix.ev.on('newsletter-participants.update', (update) => {})
nix.ev.on('newsletter-settings.update', (update) => {})
nix.ev.on('settings.update', (update) => {})
```

<p align="right"><a href="#nix408">↑ back to top</a></p>

## Links

- **Repository** — https://github.com/marrspace/nix408
- **Issues** — https://github.com/marrspace/nix408/issues
- **Upstream fork** — https://github.com/itsliaaa/baileys
- **Original Baileys** — https://github.com/WhiskeySockets/Baileys

<p align="right"><a href="#nix408">↑ back to top</a></p>

## Lineage

`nix408` → [@itsliaaa/baileys](https://github.com/itsliaaa/baileys) →
[WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)

<p align="right"><a href="#nix408">↑ back to top</a></p>

## Credits

nix408 is a fork. The people below wrote the code it builds on.

| | |
| --- | --- |
| **Baileys** | [WhiskeySockets](https://github.com/WhiskeySockets) — [purpshell](https://github.com/purpshell), [jlucaso1](https://github.com/jlucaso1), [adiwajshing](https://github.com/adiwajshing) |
| **wa-proto** | [WPP Connect](https://github.com/wppconnect-team) |
| **Upstream fork** | [Lia Wynn](https://github.com/itsliaaa) — [@itsliaaa/baileys](https://github.com/itsliaaa/baileys) |
| **`updateBlockStatus` fix** | [itsreimau](https://github.com/itsreimau) |

Maintained by [marrspace](https://github.com/marrspace). MIT — see [LICENSE](LICENSE).
