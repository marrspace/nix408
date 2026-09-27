# nix408

**WhatsApp Web automation, refined.**

nix408 is a maintained fork of [@itsliaaa/baileys](https://github.com/itsliaaa/baileys), itself a
fork of [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys). It keeps the
battle-tested WhatsApp Web protocol implementation and extends it with the message types WhatsApp
actually ships today — buttons, lists, albums, polls, payments, rich responses and more.

```bash
npm install github:marrspace/nix408#main
```

[Quick start](#quick-start) · [Reference](#documentation) · [Lineage](#lineage) · [Credits](#credits)

## About

**nix408** is our take on Baileys. It keeps the part that matters — a battle-tested
implementation of the WhatsApp Web protocol — and pushes it further:

- first-class support for **interactive messages, albums, rich responses and payments**;
- a **readable, auditable codebase** (no obfuscation, no hidden behaviour);
- **documentation with a working example for every feature**.

We don't pretend to be the original. nix408 is a fork, and we say so plainly: the upstream
authors are credited in full at the bottom of this file and in [LICENSE](LICENSE).

> **If you fork nix408, keep the credits.** That is the whole deal.

## Why nix408?

- **One library for every message type** — buttons, lists, native flows, carousels, albums, polls, payments, rich responses, code blocks, tables and inline entities.
- **Readable by design** — open any file and understand it. No obfuscation, no surprises.
- **Newsletter media, fixed** — sending media to channels no longer fails upstream.
- **Safer process handling** — FFmpeg is invoked with `spawn`, never `exec`.
- **Heavy deps stay optional** — image/audio backends are peer dependencies; install only what you use.
- **Docs that ship examples** — every feature below has a copy-paste snippet.
- **No auto-follow** — nix408 never silently follows a newsletter for you.

## What's inside

| Feature | Highlights |
| --- | --- |
| **Interactive messages** | Buttons, lists, native flows, hydrated templates, carousels |
| **Albums** | Multiple images/videos in a single album message |
| **Rich responses** | Structured rich replies with citations and sources |
| **Rich text** | Code blocks, tables, inline entities |
| **Payments** | Payment requests, invites, orders, invoices |
| **Sticker packs** | Multi-sticker packs with cover and metadata |
| **Polls & events** | Native polls, calendar events, group invites |
| **Ephemeral / view-once** | Wrapper flags incl. view-once V2 and its extension |
| **Newsletters** | Management API + the media upload fix |
| **Groups & communities** | Full management APIs |

## Requirements

- **Node.js ≥ 20** — enforced at install time by `engine-requirements.js`.
- **ESM first** — `"type": "module"`. CommonJS `require()` is supported and tested on Node 24.

## Quick start

```bash
npm install github:marrspace/nix408#main
```

```javascript
import { makeWASocket, useMultiFileAuthState } from 'nix408'

const { state, saveCreds } = await useMultiFileAuthState('auth_info')
const sock = makeWASocket({ auth: state })

sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', ({ connection }) => {
  if (connection === 'open') console.log('connected')
})
```

Full walkthrough → [Connect to WhatsApp](#connecting-to-whatsapp).

## Documentation

Every section below is a reference with runnable examples — jump to a topic:

### Contents

- [Installation](#installation)
  - [Import (ESM & CJS)](#import-esm--cjs)
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
  - [Rich Response](#rich-response)
  - [Message with Code Block](#message-with-code-block)
  - [Message with Inline Entities](#message-with-inline-entities)
  - [Message with Table](#message-with-table)
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

// --- CJS (tested and working on Node.js 24 ✅)
const { makeWASocket } = require('nix408')
```

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
    
   const sock = makeWASocket({
      logger,
      auth: state
   })

   sock.ev.on('creds.update', saveCreds)

   sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'connecting' && !sock.authState.creds.registered) {
         await delay(1500)
         const code = await sock.requestPairingCode(myPhoneNumber)
         console.log('🔗 Pairing code', ':', code)
      }
      else if (connection === 'close') {
         const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
         console.log('⚠️ Connection closed because', lastDisconnect.error, ', reconnecting ', shouldReconnect)
         if (shouldReconnect) {
            connectToWhatsApp()
         }
      }
      else if (connection === 'open') {
         console.log('✅ Successfully connected to WhatsApp')
      }
   })

   sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
         if (!message.message) continue

         console.log('🔔 Got new message', ':', message)
         await sock.sendMessage(message.key.remoteJid, {
            text: '👋🏻 Hello world'
         })
      }
   })
}

connectToWhatsApp()
```

#### Auth State

> [!NOTE]
> You can use the experimental useSingleFileAuthState and useSqliteAuthState as an alternative to useMultiFileAuthState. However, useSingleFileAuthState already includes an internal caching mechanism, so there is no need to wrap state.keys with makeCacheableSignalKeyStore.

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
    
   const sock = makeWASocket({
      logger,
      auth: state
   })

   const store = makeInMemoryStore({
      logger,
      socket: sock
   })

   store.bind(sock.ev)

   sock.ev.on('creds.update', saveCreds)

   sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'connecting' && !sock.authState.creds.registered) {
         await delay(1500)
         const code = await sock.requestPairingCode(myPhoneNumber)
         console.log('🔗 Pairing code', ':', code)
      }
      else if (connection === 'close') {
         const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
         console.log('⚠️ Connection closed because', lastDisconnect.error, ', reconnecting ', shouldReconnect)
         if (shouldReconnect) {
            connectToWhatsApp()
         }
      }
      else if (connection === 'open') {
         console.log('✅ Successfully connected to WhatsApp')
      }
   })

   sock.ev.on('chats.upsert', () => {
      console.log('✉️ Got chats', store.chats.all())
   })

   sock.ev.on('contacts.upsert', () => {
      console.log('👥 Got contacts', Object.values(store.contacts))
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

### WhatsApp IDs

`id` is the WhatsApp ID, called `jid` and `lid` too, of the person or group you're sending the message to.
- It must be in the format `[country code][phone number]@s.whatsapp.net`
   - Example for people: `19999999999@s.whatsapp.net` and `12699999999@lid`.
   - For groups, it must be in the format `123456789-123345@g.us`.
- For Meta AI, it's `11111111111@bot`.
- For broadcast lists, it's `[timestamp of creation]@broadcast`.
- For stories, the ID is `status@broadcast`.

### Sending messages

> [!NOTE]
> You can get the jid from message.key.remoteJid in the first example.

#### Text

```javascript
// --- Send a regular text message
sock.sendMessage(jid, {
   text: '👋🏻 Hello'
}, {
   quoted: message
})

// --- Send a text message with a link preview
const urlA = 'https://github.com/marrspace/nix408'

sock.sendMessage(jid, {
   text: urlA + ' 👆🏻 Check it out!',
   linkPreview: {
      'matched-text': urlA,
      title: '🌱 nix408',
      description: 'Underrated Baileys Fork',
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
   upload: sock.waUploadToServer,
   mediaTypeOverride: 'thumbnail-link'
})

// --- Set the thumbnail display size
image.height = 720
image.width = 480

sock.sendMessage(jid, {
   text: urlB + ' 👆🏻 Check it out!',
   linkPreview: {
      'matched-text': urlB,
      title: '🌱 nix408',
      description: 'Underrated Baileys Fork',
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
sock.sendMessage(jid, {
   text: '👋🏻 Hello @628123456789',
   mentions: ['628123456789@s.whatsapp.net']
}, {
   quoted: message
})

// --- Mention all
sock.sendMessage(jid, {
   text: '👋🏻 Hello @all',
   mentionAll: true
}, {
   quoted: message
})
```

#### Reaction

```javascript
sock.sendMessage(jid, {
   react: {
      key: message.key,
      text: '✨'
   }
})
```

#### Pin Message

```javascript
sock.sendMessage(jid, {
   pin: message.key,
   time: 86400, // --- Set the value in seconds: 86400 (1d), 604800 (7d), or 2592000 (30d)
   type: 1 // --- Or 2 to remove
})
```

#### Keep Chat

> [!NOTE]
> Keep Chat can only be used in chats or groups with disappearing messages enabled.

```javascript
sock.sendMessage(jid, {
   keep: message.key,
   type: 1 // --- Or 2 to remove
})
```

#### Forward Message

```javascript
sock.sendMessage(jid, {
   forward: message,
   force: true // --- Optional
})
```

#### Contact

```javascript
const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + 'FN:Lia Wynn\n'
            + 'ORG:Waitress;\n'
            + 'TEL;type=CELL;type=VOICE;waid=628123456789:+62 8123 4567 89\n'
            + 'END:VCARD'

sock.sendMessage(jid, {
   contacts: {
      displayName: 'Lia Wynn',
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
sock.sendMessage(jid, {
   location: {
      degreesLatitude: 24.121231,
      degreesLongitude: 55.1121221,
      name: '👋🏻 I am here'
   }
}, {
   quoted: message
})
```

#### Event

```javascript
sock.sendMessage(jid, {
   event: {
      name: '🎶 Meet & Mingle Party',
      description: 'Meet & Mingle Party is a fun, casual gathering to connect, chat, and build new relationships within the community.',
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

sock.sendMessage(jid, {
   groupInvite: {
      inviteCode,
      inviteExpiration: Date.now() + 86400000,
      text: '👋🏻 Hello, we invite you to join our group.',
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

sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   body: '👋🏻 Check my product here!',
   footer: 'nix408',
   product: {
      currencyCode: 'IDR',
      description: '🛍️ Interesting product!',
      priceAmount1000: 70_000_000,
      productId: randomUUID(),
      productImageCount: 1,
      salePriceAmount1000: 65_000_000,
      signedUrl: 'https://github.com/marrspace/nix408',
      title: '📦 Starseed (Premium)',
      url: 'https://github.com/marrspace/nix408'
   },
   businessOwnerJid: '0@s.whatsapp.net'
})
```

#### Poll

```javascript
// --- Regular poll message
sock.sendMessage(jid, {
   poll: {
      name: '🔥 Voting time',
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
sock.sendMessage('1211111111111@newsletter', {
   poll: {
      name: '🔥 Quiz',
      values: ['Yes', 'No'],
      correctAnswer: 'Yes',
      pollType: 1
   }
}, {
   quoted: message
})

// --- Poll result
sock.sendMessage(jid, {
   pollResult: {
      name: '📝 Poll Result',
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
sock.sendMessage(jid, {
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
sock.sendMessage(jid, {
   type: 'plain',
   buttonReply: {
      id: '#Menu',
      displayText: '✨ Interesting Menu'
   }
}, {
   quoted: message
})

// --- Using interactiveResponseMessage
sock.sendMessage(jid, {
   flowReply: {
      format: 0,
      text: '💭 Response',
      name: 'menu_options',
      paramsJson: JSON.stringify({
         id: '#Menu',
         description: '✨ Interesting Menu'
      })
   }
}, {
   quoted: message
})

// --- Using listResponseMessage
sock.sendMessage(jid, {
   listReply: {
      title: '📄 See More',
      description: '✨ Interesting Menu',
      id: '#Menu'
   }
}, {
   quoted: message
})

// --- Using templateButtonReplyMessage
sock.sendMessage(jid, {
   type: 'template',
   buttonReply: {
      id: '#Menu',
      displayText: '✨ Interesting Menu',
      index: 1
   }
}, {
   quoted: message
})
```

#### Rich Response

> [!NOTE]
> richResponse[] is a representation of [submessages[]](https://baileys.wiki/docs/api/namespaces/proto/interfaces/IAIRichResponseSubMessage) inside richResponseMessage.

> [!TIP]
> You can still use the original [submessages[]](https://baileys.wiki/docs/api/namespaces/proto/interfaces/IAIRichResponseSubMessage) field directly.
> The code example below is just an implementation using a helper, not a required structure.

```javascript
sock.sendMessage(jid, {
   disclaimerText: 'RAW submessages structure example',
   richResponse: [{
      text: 'Example Usage',
   }, {
      language: 'javascript',
      code: [{
         highlightType: 0,
         codeContent: 'console.log("Hello, World!")'
      }]
   }, {
      text: 'Pretty simple, right?\n'
   }, {
      text: 'Comparison between Node.js, Bun, and Deno',
   }, {
      title: 'Runtime Comparison',
      table: [{
         isHeading: true,
         items: ['', 'Node.js', 'Bun', 'Deno']
      }, {
         isHeading: false,
         items: ['Engine', 'V8 (C++)', 'JavaScriptCore (C++)', 'V8 (C++)']
      }, {
         isHeading: false,
         items: ['Performance', '4/5', '5/5', '4/5']
      }]
   }, {
      text: 'Does this help clarify the differences?'
   }]
})
```

> [!TIP]
> You can easily add syntax highlighting by importing tokenizeCode directly from Baileys.

```javascript
import { tokenizeCode } from 'nix408'

const language = 'javascript'
const code = 'console.log("Hello, World!")'

sock.sendMessage(jid, {
   disclaimerText: 'Example of tokenizing Code Block',
   richResponse: [{
      text: 'Example Usage',
   }, {
      language,
      code: tokenizeCode(code, language)
   }, {
      text: 'Pretty simple, right?'
   }]
})
```

> Supported Languages: css, html, javascript, typescript, python, golang, rust, c, c#, c++, bash, bat, powershell.

#### Message with Code Block

> [!NOTE]
> This feature already includes a built-in tokenizer with tokenizeCode.

```javascript
sock.sendMessage(jid, {
   disclaimerText: 'Code Block',
   headerText: '## Example Usage',
   contentText: '---',
   code: 'console.log("Hello, World!")',
   language: 'javascript',
   footerText: 'Pretty simple, right?'
})
```

#### Message with Inline Entities

```javascript
sock.sendMessage(jid, {
   disclaimerText: 'Inline Entities',
   headerText: '## Check Out!',
   contentText: '---',
   links: [{
      text: '1. Google',
      title: 'Popular Search Engine',
      url: 'https://www.google.com/'
   }, {
      text: '2. YouTube',
      title: 'Popular Streaming Platform',
      url: 'https://www.youtube.com/'
   }, {
      text: '3. Modded Baileys',
      title: 'Underrated Baileys Fork',
      url: 'https://github.com/marrspace/nix408'
   }],
   footerText: '---'
})
```

#### Message with Table

```javascript
sock.sendMessage(jid, {
   disclaimerText: 'Table',
   headerText: '## Comparison between Node.js, Bun, and Deno',
   contentText: '---',
   title: 'Runtime Comparison',
   table: [
      ['', 'Node.js', 'Bun', 'Deno'],
      ['Engine', 'V8 (C++)', 'JavaScriptCore (C++)', 'V8 (C++)'],
      ['Performance', '4/5', '5/5', '4/5']
   ],
   noHeading: false, // --- Optional
   footerText: 'Does this help clarify the differences?'
})
```

#### Status Mention

```javascript
sock.sendMessage([jidA, jidB, jidC], {
   text: 'Hello! 👋🏻'
})
```

### Sending media

> [!NOTE]
> For media messages, you can pass a Buffer directly, or an object with either { stream: Readable } or { url: string } (local file path or HTTP/HTTPS URL).

#### Image

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '🔥 Superb'
}, {
   quoted: message
})
```

#### Video

```javascript
sock.sendMessage(jid, {
   video: {
      url: './path/to/video.mp4'
   },
   gifPlayback: false, // --- Set true if you want to send video as GIF
   ptv: false,  // --- Set true if you want to send video as PTV
   caption: '🔥 Superb'
}, {
   quoted: message
})
```

#### Sticker

```javascript
sock.sendMessage(jid, {
   sticker: {
      url: './path/to/sticker.webp'
   }
}, {
   quoted: message
})
```

#### Audio

```javascript
sock.sendMessage(jid, {
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
sock.sendMessage(jid, {
   document: {
      url: './path/to/document.pdf'
   },
   mimetype: 'application/pdf',
   caption: '✨ My work!'
}, {
   quoted: message
})
```

#### Album (Image & Video)

```javascript
sock.sendMessage(jid, {
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
sock.sendMessage(jid, {
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
   name: '📦 My Sticker Pack',
   publisher: '🌟 Lia Wynn',
   description: 'nix408'
}, {
   quoted: message
})
```

### Interactive messages

#### Buttons

```javascript
// --- Regular buttons message
sock.sendMessage(jid, {
   text: '👆🏻 Buttons!',
   footer: 'nix408',
   buttons: [{
      text: '👋🏻 SignUp',
      id: '#SignUp'
   }]
}, {
   quoted: message
})

// --- Buttons with Media & Native Flow
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '👆🏻 Buttons and Native Flow!',
   footer: 'nix408',
   buttons: [{
      text: '👋🏻 Rating',
      id: '#Rating'
   }, {
      text: '📋 Select',
      sections: [{
         title: '✨ Section 1',
         rows: [{
            header: '',
            title: '💭 Secret Ingredient',
            description: '',
            id: '#SecretIngredient'
         }]
      }, {
         title: '✨ Section 2',
         highlight_label: '🔥 Popular',
         rows: [{
            header: '',
            title: '🏷️ Coupon',
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
sock.sendMessage(jid, {
   text: '📋 List!',
   footer: 'nix408',
   buttonText: '📋 Select',
   title: '👋🏻 Hello',
   sections: [{
      title: '🚀 Menu 1',
      rows: [{
         title: '✨ AI',
         description: '',
         rowId: '#AI'
      }]
   }, {
      title: '🌱 Menu 2',
      rows: [{
         title: '🔍 Search',
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
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '🗄️️ Interactive!',
   footer: 'nix408',
   optionText: '👉🏻 Select Options', // --- Optional, wrap all native flow into a single list
   optionTitle: '📄 Select Options', // --- Optional
   offerText: '🏷️ Newest Coupon!', // --- Optional, add an offer into message
   offerCode: 'nix408', // --- Optional
   offerUrl: 'https://github.com/marrspace/nix408', // --- Optional
   offerExpiration: Date.now() + 3_600_000, // --- Optional
   nativeFlow: [{
      text: '👋🏻 Greeting',
      id: '#Greeting',
      icon: 'review' // --- Optional
   }, {
      text: '📞 Call',
      call: '628123456789'
   }, {
      text: '📋 Copy',
      copy: 'nix408'
   }, {
      text: '🌐 Source',
      url: 'https://github.com/marrspace/nix408',
      useWebview: true // --- Optional
   }, {
      text: '📋 Select',
      sections: [{
         title: '✨ Section 1',
         rows: [{
            header: '',
            title: '🏷️ Coupon',
            description: '',
            id: '#CouponCode'
         }]
      }, {
         title: '✨ Section 2',
         highlight_label: '🔥 Popular',
         rows: [{
            header: '',
            title: '💭 Secret Ingredient',
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
sock.sendMessage(jid, {
   text: '🗂️ Interactive with Carousel!',
   footer: 'nix408',
   cards: [{
      image: {
         url: './path/to/image.jpg'
      },
      caption: '🖼️ Image 1',
      footer: '🏷️️ Pinterest',
      nativeFlow: [{
         text: '🌐 Source',
         url: 'https://github.com/marrspace/nix408',
         useWebview: true
      }]
   }, {
      image: {
         url: './path/to/image.jpg'
      },
      caption: '🖼️ Image 2',
      footer: '🏷️ Pinterest',
      offerText: '🏷️ New Coupon!',
      offerCode: 'nix408',
      offerUrl: 'https://github.com/marrspace/nix408',
      offerExpiration: Date.now() + 3_600_000,
      nativeFlow: [{
         text: '🌐 Source',
         url: 'https://github.com/marrspace/nix408'
      }]
   }, {
      image: {
         url: './path/to/image.jpg'
      },
      caption: '🖼️ Image 3',
      footer: '🏷️ Pinterest',
      optionText: '👉🏻 Select Options',
      optionTitle: '👉🏻 Select Options',
      offerText: '🏷️ New Coupon!',
      offerCode: 'nix408',
      offerUrl: 'https://github.com/marrspace/nix408',
      offerExpiration: Date.now() + 3_600_000,
      nativeFlow: [{
         text: '🛒 Product',
         id: '#Product',
         icon: 'default'
      }, {
         text: '🌐 Source',
         url: 'https://github.com/marrspace/nix408'
      }]
   }]
}, {
   quoted: message
})

// --- Native Flow with Audio in the Footer
sock.sendMessage(jid, {
   text: '🔈 Music in the footer!',
   audioFooter: {
      url: './path/to/audio.mp3'
   }, // --- Like other media upload methods, buffers and streams are supported
   nativeFlow: [{
      text: '👍🏻 Good, next',
      id: '#Next',
      icon: 'review'
   }, {
      text: '👎🏻 Skip',
      id: '#Skip',
      icon: 'default'
   }]
}, {
   quoted: message
})
```

#### Hydrated Template

```javascript
sock.sendMessage(jid, {
   title: '👋🏻 Hello',
   image: {
      url: './path/to/image.jpg'
   },
   caption: '🫙 Template!',
   footer: 'nix408',
   templateButtons: [{
      text: '👉?? Tap Here',
      id: '#Order'
   }, {
      text: '🌐 Source',
      url: 'https://github.com/marrspace/nix408'
   }, {
      text: '📞 Call',
      call: '628123456789'
   }]
}, {
   quoted: message
})
```

### Payment messages

#### Invite Payment

```javascript
sock.sendMessage(jid, {
   paymentInviteServiceType: 3 // 1, 2, or 3
})
```

#### Invoice

> [!NOTE]
> Invoice message are not supported yet.

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   invoiceNote: '🏷️ Invoice'
})
```

#### Order

```javascript
sock.sendMessage(chat, {
   orderText: '🛍️ Order',
   thumbnail: fs.readFileSync('./path/to/image.jpg') // --- Must in buffer format
}, {
   quoted: message
})
```

#### Request Payment

```javascript
sock.sendMessage(jid, {
   text: '💳 Request Payment',
   requestPaymentFrom: '0@s.whatsapp.net'
})
```

### Message options

#### AI Icon

> [!NOTE]
> It only works in private chat (@s.whatsapp.net).

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '🤖 With AI icon!',
   ai: true
}, {
   quoted: message
})
```

#### Ephemeral

> [!NOTE]
> Wrap message into ephemeralMessage

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '👁️ Ephemeral',
   ephemeral: true
})
```

#### External Ad Reply

> [!NOTE]
> Add an ad thumbnail to messages (may not be displayed on some WhatsApp versions).

```javascript
sock.sendMessage(jid, {
   text: '📰 External Ad Reply',
   externalAdReply: {
      title: '📝 Did you know?',
      body: '❓ I dont know',
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
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '👥 Group Status!',
   groupStatus: true
})
```

#### Lottie Sticker

> [!NOTE]
> Wrap message into lottieStickerMessage

```javascript
sock.sendMessage(jid, {
   sticker: {
      url: './path/to/sticker.webp'
   },
   isLottie: true
})
```

#### Raw

```javascript
sock.sendMessage(jid, {
   extendedTextMessage: {
      text: '📃 Built manually from scratch using the raw WhatsApp proto structure',
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
sock.sendMessage(jid, {
   text: '🏷️ Just a label!',
   secureMetaServiceLabel: true
})
```

#### Spoiler

> [!NOTE]
> Wrap message into spoilerMessage

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '❔ Spoiler',
   spoiler: true
})
```

#### View Once

> [!NOTE]
> Wrap message into viewOnceMessage

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '👁️ View Once',
   viewOnce: true
})
```

#### View Once V2

> [!NOTE]
> Wrap message into viewOnceMessageV2

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '👁️ View Once V2',
   viewOnceV2: true
})
```

#### View Once V2 Extension

> [!NOTE]
> Wrap message into viewOnceMessageV2Extension

```javascript
sock.sendMessage(jid, {
   image: {
      url: './path/to/image.jpg'
   },
   caption: '👁️ View Once V2 Extension',
   viewOnceV2Extension: true
})
```

### Modifying messages

#### Delete Messages

```javascript
sock.sendMessage(jid, {
   delete: message.key
})
```

#### Edit Messages

```javascript
// --- Edit plain text
sock.sendMessage(jid, {
   text: '✨ I mean, nice!',
   edit: message.key
})

// --- Edit media messages caption
sock.sendMessage(jid, {
   caption: '✨ I mean, here is the image!',
   edit: message.key
})
```

### API reference

#### Find User ID (JID|PN/LID)

> [!NOTE]
> The ID must contain numbers only (no +, (), or -) and must include the country code with WhatsApp ID format.

```javascript
// --- PN (Phone Number)
const phoneNumber = '6281111111111@s.whatsapp.net'

const ids = await sock.findUserId(phoneNumber)

console.log('🏷️ Got user ID', ':', ids)

// --- LID (Local Identifier)
const lid = '43411111111111@lid'

const ids = await sock.findUserId(lid)

console.log('🏷️ Got user ID', ':', ids)

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

await sock.requestPairingCode(phoneNumber, customPairingCode)

console.log('🔗 Pairing code', ':', customPairingCode)
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

console.log('✅ Process completed!')
console.dir(output, { depth: null })
```

#### Newsletter Management

```javascript
// --- Create a new one
sock.newsletterCreate('nix408', '📣 Fresh updates weekly')

// --- Get info
const metadata = sock.newsletterMetadata('1231111111111@newsletter')
console.dir(metadata, { depth: null })

// --- Get subscribers count
const subscribers = await sock.newsletterSubscribers('1231111111111@newsletter')
console.dir(subscribers, { depth: null })

// --- Follow and Unfollow
sock.newsletterFollow('1231111111111@newsletter')
sock.newsletterUnfollow('1231111111111@newsletter')

// --- Mute and Unmute
sock.newsletterMute('1231111111111@newsletter')
sock.newsletterUnmute('1231111111111@newsletter')

// --- Demote admin
sock.newsletterDemote('1231111111111@newsletter', '6281111111111@s.whatsapp.net')

// --- Change owner
sock.newsletterChangeOwner('1231111111111@newsletter', '6281111111111@s.whatsapp.net')

// --- Update newsletter
sock.newsletterUpdate('1231111111111@newsletter', { name: 'nix408' })

// --- Change name
sock.newsletterUpdateName('1231111111111@newsletter', '📦 nix408')

// --- Change description
sock.newsletterUpdateDescription('1231111111111@newsletter', '📣 Fresh updates weekly')

// --- Change photo
sock.newsletterUpdatePicture('1231111111111@newsletter', {
   url: 'path/to/image.jpg'
})

// --- Remove photo
sock.newsletterRemovePicture('1231111111111@newsletter')

// --- React to a message
sock.newsletterReactMessage('1231111111111@newsletter', '100', '💛')

// --- Get admin count
const count = await sock.newsletterAdminCount('1231111111111@newsletter')

// --- Get all subscribed newsletters
const newsletters = await sock.newsletterSubscribed()
console.dir(newsletters, { depth: null })

// --- Fetch newsletter messages
const messages = sock.newsletterFetchMessages('jid', '1231111111111@newsletter', 50, 0, 0)
console.dir(messages, { depth: null })

// --- Delete newsletter
sock.newsletterDelete('1231111111111@newsletter')
```

#### Group Management

```javascript
// --- Create a new one and add participants using their JIDs
const group = sock.groupCreate('nix408', ['628123456789@s.whatsapp.net'])
console.dir(group, { depth: null })

// --- Get info
const metadata = await sock.groupMetadata(jid)
console.dir(metadata, { depth: null })

// --- Get group invite code
const inviteCode = await sock.groupInviteCode(jid)
console.dir(inviteCode, { depth: null })


// --- Revoke invite link
sock.groupRevokeInvite(jid)

// --- Accept group invite
sock.groupAcceptInvite(inviteCode)

// --- Leave group
sock.groupLeave(jid)

// --- Add participants
sock.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'add')

// --- Remove participants
sock.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'remove')

// --- Promote to admin
sock.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'promote')

// --- Demote from admin
sock.groupParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'demote')

// --- Accept join requests
sock.groupRequestParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'approve')

// --- Change name
sock.groupUpdateSubject(jid, '📦 nix408')

// --- Change description
sock.groupUpdateDescription(jid, 'Updated description')

// --- Change photo
sock.updateProfilePicture(jid, {
   url: 'path/to/image.jpg'
})

// --- Remove photo
sock.removeProfilePicture(jid)

// --- Set group as admin only for chatting
sock.groupSettingUpdate(jid, 'announcement')

// --- Set group as open to all for chatting
sock.groupSettingUpdate(jid, 'not_announcement')

// --- Set admin only can edit group info
sock.groupSettingUpdate(jid, 'locked')

// --- Set all participants can edit group info
sock.groupSettingUpdate(jid, 'unlocked')

// --- Set admin only can add participants
sock.groupMemberAddMode(jid, 'admin_add')

// --- Set all participants can add participants
sock.groupMemberAddMode(jid, 'all_member_add')

// --- Enable or disable temporary messages with seconds format
sock.groupToggleEphemeral(jid, 86400)

// --- Disable temporary messages
sock.groupToggleEphemeral(jid, 0)

// --- Enable or disable membership approval mode
sock.groupJoinApprovalMode(jid, 'on')
sock.groupJoinApprovalMode(jid, 'off')

// --- Get all groups metadata
const groups = await sock.groupFetchAllParticipating()
console.dir(groups, { depth: null })

// --- Get pending join requests
const requests = await sock.groupRequestParticipantsList(jid)
console.dir(requests, { depth: null })

// --- Get group info from link
const group = await sock.groupGetInviteInfo('ABC123456789')
console.log('👥 Got group info from invite code', ':', group)

// --- Update bot member label
sock.updateMemberLabel(jid, 'nix408')
```

#### Community Management

```javascript
// --- Create a new one and add description
const community = await sock.communityCreate('nix408', '📣 Fresh updates weekly')
console.dir(community, { depth: null })

// --- Create a subgroup for community and add participants using their JIDs
const group = await sock.communityCreateGroup('📢 Announcements', ['628123456789@s.whatsapp.net'], communityJid)

// --- Link an existing group
sock.communityLinkGroup(groupJid, communityJid)

// --- Unlink an existing group
sock.communityUnlinkGroup(groupJid, communityJid)

// --- Get info
const metadata = await sock.communityMetadata(jid)
console.dir(metadata, { depth: null })

// --- Get community invite code
const inviteCode = await sock.communityInviteCode(jid)
console.dir(inviteCode, { depth: null })

// --- Revoke invite link
sock.communityRevokeInvite(jid)

// --- Accept community invite
sock.communityAcceptInvite(inviteCode)

// --- Leave community
sock.communityLeave(jid)

// --- Accept join requests
sock.communityRequestParticipantsUpdate(jid, ['628123456789@s.whatsapp.net'], 'approve')

// --- Change name
sock.communityUpdateSubject(jid, '📦 nix408')

// --- Change description
sock.communityUpdateDescription(jid, 'Updated description')

// --- Set community as admin only for chatting
sock.communitySettingUpdate(jid, 'announcement')

// --- Set community as open to all for chatting
sock.communitySettingUpdate(jid, 'not_announcement')

// --- Set admin only can edit community info
sock.communitySettingUpdate(jid, 'locked')

// --- Set all participants can edit community info
sock.communitySettingUpdate(jid, 'unlocked')

// --- Set admin only can add participants
sock.communityMemberAddMode(jid, 'admin_add')

// --- Set all participants can add participants
sock.communityMemberAddMode(jid, 'all_member_add')

// --- Enable or disable temporary messages with seconds format
sock.communityToggleEphemeral(jid, 86400)

// --- Disable temporary messages
sock.communityToggleEphemeral(jid, 0)

// --- Enable or disable membership approval mode
sock.communityJoinApprovalMode(jid, 'on')
sock.communityJoinApprovalMode(jid, 'off')

// --- Get all communities metadata
const communities = await sock.communityFetchAllParticipating()
console.dir(communities, { depth: null })

// --- Get all community linked groups
const linked = await sock.communityFetchLinkedGroups(jid)
console.dir(linked, { depth: null })

// --- Get pending join requests
const requests = await sock.communityRequestParticipantsList(jid)
console.dir(requests, { depth: null })

// --- Get community info from link
const community = await sock.communityGetInviteInfo('ABC123456789')
console.log('👥 Got community info from invite code', ':', community)
```

#### Profile Management

```javascript
// --- Get user profile picture
const url = await sock.profilePictureUrl(jid, 'image')
console.log('🖼️ Got user profile url', url)

// --- Update profile picture
sock.updateProfilePicture(jid, buffer)
sock.updateProfilePicture(jid, { url })

// --- Remove profile picture
sock.removeProfilePicture(jid)

// --- Update profile name
sock.updateProfileName('My Name')

// --- Update profile status
sock.updateProfileStatus('Available')

// --- Presence
sock.sendPresenceUpdate('available', jid)
sock.presenceSubscribe(jid)

// --- Read receipts
sock.readMessages([message.key])
sock.sendReceipt(jid, participant, [messageId], 'read')

// --- Block user
sock.updateBlockStatus(jid, 'block')

// --- Unblock user
sock.updateBlockStatus(jid, 'unblock')

// --- Fetch blocklist
const blocked = await sock.fetchBlocklist()
console.dir(blocked, { depth: null })

// --- Modify chats
sock.chatModify({
   archive: true,
   lastMessageOrig: message,
   lastMessage: message
}, jid)

// --- Star messages
sock.star(jid, [{ id: messageId, fromMe: true }], true)

// --- Contact
sock.addOrEditContact(jid, { displayName: 'Starseed' })
sock.removeContact(jid)

// --- Label
sock.addChatLabel(jid, labelId)
sock.removeChatLabel(jid, labelId)
sock.addMessageLabel(jid, messageId, labelId)

// --- App state sync
sock.resyncAppState(['regular', 'critical_block'], true)

// --- Get business profile
const profile = await sock.getBusinessProfile(jid)
console.dir(profile, { depth: null })
```

#### Business Management

```javascript
// --- Create a new product
const product = await sock.productCreate({
   name: '🧩 Starseed (Premium)',
   description: 'Get a full version of Starseed!',
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
await sock.productUpdate(productId, {
   name: '🧩 Starseed (Premium)',
   description: 'Get a full version of Starseed with more features!',
   price: 75000,
   currency: 'IDR',
   images: [
      {
         url: './path/to/image.jpg'
      }
   ]
})

// --- Delete product
sock.productDelete([productId])

// --- Get catalog info
const { products, nextPageCursor } = await sock.getCatalog({
  jid: '628123456789@s.whatsapp.net',
  limit: 10
})

// --- Get collections
const collections = await sock.getCollections('628123456789@s.whatsapp.net', 10)
console.dir(collections, { depth: null })

// --- Get order info
const order = await sock.getOrderDetails(orderId, tokenBase64)
console.dir(order, { depth: null })

// --- Update business profile
await sock.updateBusinessProfile({
   address: 'Jakarta, Indonesia',
   description: '🛒 Official Starseed Store',
   websites: ['https://github.com/marrspace/nix408'],
   email: 'more-more@gmail.com',
   hours: {
      timezone: 'Asia/Jakarta',
      days: [{ day: 'mon', mode: 'open_24h' }]
   }
})

// --- Update cover
sock.updateCoverPhoto({
   url: './path/to/image.jpg'
})

// --- Remove cover
sock.removeCoverPhoto(coverId)

// --- Update quick replies
sock.addOrEditQuickReply({
  shortcut: 'hello',
  message: 'Hello from business account',
})

// --- Remove quick reply
sock.removeQuickReply(timestamp)
```

#### Privacy Management

```javascript
// --- Update last seen privacy
sock.updateLastSeenPrivacy('all')
sock.updateLastSeenPrivacy('contacts')
sock.updateLastSeenPrivacy('contact_blacklist')
sock.updateLastSeenPrivacy('nobody')

// --- Update online privacy
sock.updateOnlinePrivacy('all')
sock.updateOnlinePrivacy('match_last_seen')

// --- Update profile picture privacy
sock.updateProfilePicturePrivacy('contacts')

// --- Update status privacy
sock.updateStatusPrivacy('contacts')

// --- Update read receipts privacy
sock.updateReadReceiptsPrivacy('all')
sock.updateReadReceiptsPrivacy('none')

// --- Update groups add privacy
sock.updateGroupsAddPrivacy('all')
sock.updateGroupsAddPrivacy('contacts')

// --- Update messages privacy
sock.updateMessagesPrivacy('all')
sock.updateMessagesPrivacy('contacts')
sock.updateMessagesPrivacy('nobody')

// --- Update call privacy
sock.updateCallPrivacy('everyone')

// --- Update default disappearing mode
sock.updateDefaultDisappearingMode(86400)

// --- Update link previews privacy
sock.updateDisableLinkPreviewsPrivacy(true)
```

#### Events

```javascript
sock.ev.on('connection.update', async (update) => {})
sock.ev.on('creds.update', (update) => {})
sock.ev.on('messaging-history.set', (update) => {})
sock.ev.on('messaging-history.status', (update) => {})
sock.ev.on('chats.upsert', (update) => {})
sock.ev.on('chats.update', (update) => {})
sock.ev.on('chats.delete', (update) => {})
sock.ev.on('chats.lock', (update) => {})
sock.ev.on('lid-mapping.update', (update) => {})
sock.ev.on('presence.update', (update) => {})
sock.ev.on('contacts.upsert', (update) => {})
sock.ev.on('contacts.update', (update) => {})
sock.ev.on('messages.delete', (update) => {})
sock.ev.on('messages.update', (update) => {})
sock.ev.on('messages.media-update', (update) => {})
sock.ev.on('messages.upsert', (update) => {})
sock.ev.on('messages.reaction', (update) => {})
sock.ev.on('message-receipt.update', (update) => {})
sock.ev.on('groups.upsert', (update) => {})
sock.ev.on('groups.update', (update) => {})
sock.ev.on('group-participants.update', (update) => {})
sock.ev.on('group.join-request', (update) => {})
sock.ev.on('group.member-tag.update', (update) => {})
sock.ev.on('blocklist.set', (update) => {})
sock.ev.on('blocklist.update', (update) => {})
sock.ev.on('call', (update) => {})
sock.ev.on('labels.edit', (update) => {})
sock.ev.on('labels.association', (update) => {})
sock.ev.on('newsletter.reaction', (update) => {})
sock.ev.on('newsletter.view', (update) => {})
sock.ev.on('newsletter-participants.update', (update) => {})
sock.ev.on('newsletter-settings.update', (update) => {})
sock.ev.on('settings.update', (update) => {})
```

## Links

- **Repository** — https://github.com/marrspace/nix408
- **Issues** — https://github.com/marrspace/nix408/issues
- **Upstream fork** — https://github.com/itsliaaa/baileys
- **Original Baileys** — https://github.com/WhiskeySockets/Baileys

## Lineage

`nix408` → [@itsliaaa/baileys](https://github.com/itsliaaa/baileys) →
[WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)

## Credits

nix408 is a fork. Everything below belongs to the people who built the foundation —
please keep it intact.

**Original Baileys** — maintained by [WhiskeySockets](https://github.com/WhiskeySockets)
and contributors:

- [purpshell](https://github.com/purpshell)
- [jlucaso1](https://github.com/jlucaso1)
- [adiwajshing](https://github.com/adiwajshing)

**Protocol Buffer definitions** — maintained by
[WPP Connect](https://github.com/wppconnect-team) via
[`wa-proto`](https://github.com/wppconnect-team/wa-proto).

**Upstream fork** — additional enhancements and modifications by
[Lia Wynn](https://github.com/itsliaaa) ([@itsliaaa/baileys](https://github.com/itsliaaa/baileys)).

**Special thanks** — [itsreimau](https://github.com/itsreimau) for the `updateBlockStatus` fix.

<!-- Please do not replace the upstream names above with yours. It's disrespectful. -->

**nix408** is maintained by [marrspace](https://github.com/marrspace).

> [!CAUTION]
> **Modification, removal, or misrepresentation of these credits is strictly prohibited. Any redistribution or fork must preserve this section in its original form without exception.**
