# Persona clip reels

Generated from the KERICONF26 value-tagged clips (229 segments). Each link opens the [video gallery](https://keri.foundation/confs/2026/videos/) at the exact moment and stops at the end of the clip. Persona rationale: [persona-plan.md](./persona-plan.md).

## Sarah — Enterprise CISO / Security Architect

> KERI assumes you will be breached and lets you recover: pre-rotated keys make stolen credentials dead on arrival, and everything is verifiable, not merely validated.

Value tags: `SECUFIRST`, `FAULTTOL`, `OTHUNSAFE`, `ANTIFRAUD`, `VERNOTVAL`, `NOSHARSECR`, `ENTROPY`

- [10:41–13:10 · Alan Davies — ACDCs for Enterprises](https://keri.foundation/confs/2026/videos/#acdcs-for-enterprises-alan-davies&t=641&e=790)
  “From online logging and username password towards trustability” — tags: OTHUNSAFE, SECUFIRST, 1PERSCONTR, VERNOTVAL, GRALIFCONF, FAULTTOL, LEGOVPOL
- [3:31–4:39 · Alan Davies — ACDCs for Enterprises](https://keri.foundation/confs/2026/videos/#acdcs-for-enterprises-alan-davies&t=211&e=279)
  “Need to authenticate came in: username password, resulting in rampant online fraud trying to mitigate by detecting fraud; a losing battle.” — tags: OTHUNSAFE, SAFETY, SECUFIRST, ANTIFRAUD
- [29:11–30:03 · Jared Jefferey — FHIR and CMS](https://keri.foundation/confs/2026/videos/#fhir-and-cms-jared-jefferey&t=1751&e=1803)
  “Currently: Terms of trust on the connection, it's certificates, it's tokens it's very manual And often the org identity is assumed, not proven. They have some evidence of who you are, but not cryptographic evidence won't hold up in court” — tags: NOSHARSECR, INFRASURF, OTHUNSAFE, VERNOTVAL, LEGOVPOL
- [0:39–3:56 · Phil Feairheller — ACDCs for Authorization](https://keri.foundation/confs/2026/videos/#acdcs-for-authorization-phil-feairheller&t=39&e=236)
  “Introductory overview by a walk-through of Video demo SEDI conference: ACDCs act like passkeys:” — tags: SECUFIRST, NOSHARSECR, PERPETUAL, ATSCALE, NOWSTACK, VERNOTVAL, 1PERSCONTR
- [11:23–19:40 · Fergal O'Conner — Signify Security Architecture](https://keri.foundation/confs/2026/videos/#signify-security-architecture-fergal-o-conner&t=683&e=1180)
  “Trust relationship between KERIA and Signify. Signify is stateless intentionally, it's not a full local KERI state engine. It keeps/reconstructs the cryptographic capability needed to control the identity, while KERIA maintains the persistent operational KERI state on behalf of the client. Process explanation. Cooperative delegation Fully signed Http-requests. Not using bearer tokens Keyrotate passcode” — tags: SECUFIRST, OTHUNSAFE, FAULTTOL

## Marcus — Regulator / Policy Maker / Legal Counsel

> KERI is the only identity layer that can model real-world legal authority — with recourse on identifiable peers — without a blockchain or a foreign trust anchor.

Value tags: `LEGOVPOL`, `ORGID`, `RECOUPEERS`, `REALMPRAGM`, `1PERSCONTR`, `CANMODELRW`, `PROVCONTXT`

- [12:30–14:46 · George McEwan — The Landscape of SEDI](https://keri.foundation/confs/2026/videos/#the-landscape-of-sedi-george-mcewan&t=750&e=886)
  “Community education: open sourcing of privacy and other digital identity values we hope to have. Example: healthcare, where scary policies that breach human rights should become illegal. Personas are legitimate human rights” — tags: LEGOVPOL, COMMUNEDU, RECOUPEERS, 1PERSCONTR
- [3:56–7:07 · Phil Feairheller — ACDCs for Authorization](https://keri.foundation/confs/2026/videos/#acdcs-for-authorization-phil-feairheller&t=236&e=427)
  “HL7 FHIR: create authorizations for parties in an exchange of data that has a chosen limited context. payer-to-payer data exchange, growing number of connections needed, accelerated by vLEI integration” — tags: LEGOVPOL, PROVCONTXT, 1PERSCONTR, NOWSTACK, ATSCALE
- [28:08–29:11 · Jared Jefferey — FHIR and CMS](https://keri.foundation/confs/2026/videos/#fhir-and-cms-jared-jefferey&t=1688&e=1751)
  “CMS-0057 wants the industry to set standards, like HL7, and then together they put them into mandates” — tags: REALMPRAGM, LEGOVPOL
- [16:18–18:38 · Phil Feairheller — ACDCs for Authorization](https://keri.foundation/confs/2026/videos/#acdcs-for-authorization-phil-feairheller&t=978&e=1118)
  “IPEX issuance and presentation exchange protocol, step by step explained contractually protected disclosure Credential Offer Commitment: user offers the terms and conditions, no data exposed; server signs, then data exposed” — tags: GRALIFCONF, LEGOVPOL, 1PERSCONTR
- [10:41–13:10 · Alan Davies — ACDCs for Enterprises](https://keri.foundation/confs/2026/videos/#acdcs-for-enterprises-alan-davies&t=641&e=790)
  “From online logging and username password towards trustability” — tags: OTHUNSAFE, SECUFIRST, 1PERSCONTR, VERNOTVAL, GRALIFCONF, FAULTTOL, LEGOVPOL

## Dev — Software Engineer / Architect

> KERI already solved the problem you would otherwise bolt together from five libraries — persistent identifiers, verifiable event logs, delegation — vendor- and crypto-agnostic, like git for identity.

Value tags: `HARPROB1ST`, `NOWSTACK`, `EASEOFUSE`, `AGNOSTIC`, `UNBROCHAIN`, `GRASPEASY`, `MATURITY`

- [7:07–9:39 · Phil Feairheller — ACDCs for Authorization](https://keri.foundation/confs/2026/videos/#acdcs-for-authorization-phil-feairheller&t=427&e=579)
  “OAuth2.0 legacy but essential for interoperability, RACK -> full security between endpoints 47-days time-out of X.509 certification hits you; and your connections! replace X.509 with vLEI” — tags: SECUFIRST, UNBROCHAIN, VERNOTVAL, EASEOFUSE, MARKETPEN, ATSCALE, NOWSTACK
- [5:50–7:24 · Samuel Smith — The Digital Identity Tradespace](https://keri.foundation/confs/2026/videos/#the-digital-identity-tradespace-samuel-smith&t=350&e=444)
  “Why we solve the hard problem first: the hard problem of decentralized data is how do I solve perpetual issuances without a centralized authority?” — tags: NOWSTACK, HARPROB1ST
- [19:02–20:19 · Kent Bull — KERIpy Async Architecture](https://keri.foundation/confs/2026/videos/#keripy-async-architecture-kent-bull&t=1142&e=1219)
  “One of the major benefits of structured concurrency: you can have error propagation all the way up to the root scheduler and handle it there or in any of the parents. It's an intuitive, straightforward way to handle exceptions. consistent, predictable exception behavior” — tags: EASEOFUSE, HARPROB1ST, ATSCALE
- [14:13–16:18 · Phil Feairheller — ACDCs for Authorization](https://keri.foundation/confs/2026/videos/#acdcs-for-authorization-phil-feairheller&t=853&e=978)
  “Authorization code flow: log in with - and leverage vLEI credentials From regular FHIR flow to KERI/ACDC flow. Hyper churn your credentials and flood the systems that serve you with the ACDC ->” — tags: NOWSTACK, 1PERSCONTR, EASEOFUSE
- [5:03–9:10 · Fergal O'Conner — Signify Security Architecture](https://keri.foundation/confs/2026/videos/#signify-security-architecture-fergal-o-conner&t=303&e=550)
  “Signify is KATE and therefore Fully featured Java implementation of Signify Gives you a higher level API Separation of agents (databases) in a multi-agent setup: only a one-to-one relation between 1 Agent and 1 Client.” — tags: SECUFIRST, AGNOSTIC, MATURITY, GRASPEASY

## Elena — Business Decision Maker / Product Executive

> Verifiable organizational credentials collapse onboarding and KYC from weeks to minutes, cut fraud losses structurally, and run at global scale on infrastructure you already have.

Value tags: `BIZEFFCASE`, `ATSCALE`, `ECONINFEA`, `EASEOFUSE`, `INFRASURF`, `MARKETPEN`

- [2:34–3:31 · Alan Davies — ACDCs for Enterprises](https://keri.foundation/confs/2026/videos/#acdcs-for-enterprises-alan-davies&t=154&e=211)
  “Things changed when global communications arrived: telephone, fax and now the internet. Enabled us to execute transactions remotely Buy when we want, what we want, where we want, and turns up the next day” — tags: BIZEFFCASE, ATSCALE, EASEOFUSE
- [20:47–23:07 · Alan Davies — ACDCs for Enterprises](https://keri.foundation/confs/2026/videos/#acdcs-for-enterprises-alan-davies&t=1247&e=1387)
  “If you introduce KERI and ACDCs bite by bite to a high value transaction that's already being executed by business applications today and they see the immediate benefits and then once businesses start seeing the immediate benefits it'll start to flood other applications” — tags: INFRASURF, GRASPEASY, BIZEFFCASE, MATURITY, MARKETPEN
- [7:07–9:39 · Phil Feairheller — ACDCs for Authorization](https://keri.foundation/confs/2026/videos/#acdcs-for-authorization-phil-feairheller&t=427&e=579)
  “OAuth2.0 legacy but essential for interoperability, RACK -> full security between endpoints 47-days time-out of X.509 certification hits you; and your connections! replace X.509 with vLEI” — tags: SECUFIRST, UNBROCHAIN, VERNOTVAL, EASEOFUSE, MARKETPEN, ATSCALE, NOWSTACK
- [35:43–37:42 · Phil Windley — Digital Identity Needs a Legal Foundation](https://keri.foundation/confs/2026/videos/#digital-identity-needs-a-legal-foundation-phil-windley&t=2143&e=2262)
  “what's the technology opportunity of which the requirements are set out by SEDI: (decentralized)” — tags: 1PERSCONTR, INCLUSIVE, ATSCALE, BIZEFFCASE
- [34:38–36:52 · Jared Jefferey — FHIR and CMS](https://keri.foundation/confs/2026/videos/#fhir-and-cms-jared-jefferey&t=2078&e=2212)
  “trust equity framework: I know who you are, who you work for I know what you're doing which is where DirectTrust comes in and to the root of trust Huge cost, time and effort savers attackers will move on to elsewhere” — tags: PROVCONTXT, VERNOTVAL, 1PERSCONTR, BIZEFFCASE, ECONINFEA

## Priya — SSI / Digital-Identity Community Skeptic

> Judge the tradespace, not the tribe: KERI is the only design that gets persistent identifiers without a ledger, and it bridges to the DID world instead of replacing it.

Value tags: `VERNOTVAL`, `MINIMSUFFI`, `CANMODELRW`, `SPACTRILL`, `GRALIFCONF`, `NOSHARSECR`, `OTHUNSAFE`

- [33:17–34:38 · Jared Jefferey — FHIR and CMS](https://keri.foundation/confs/2026/videos/#fhir-and-cms-jared-jefferey&t=1997&e=2078)
  “Can we trust the connections we're able to make? Yes, if: organizational binding prove delegation and delgeated authority and for purpose of use and bind together cryptographically; encryption and attribution. You need something that's verifiable, auditable, automated, secure and open.” — tags: PROVCONTXT, SPACTRILL, MINIMSUFFI, GRALIFCONF
- [10:41–13:10 · Alan Davies — ACDCs for Enterprises](https://keri.foundation/confs/2026/videos/#acdcs-for-enterprises-alan-davies&t=641&e=790)
  “From online logging and username password towards trustability” — tags: OTHUNSAFE, SECUFIRST, 1PERSCONTR, VERNOTVAL, GRALIFCONF, FAULTTOL, LEGOVPOL
- [29:11–30:03 · Jared Jefferey — FHIR and CMS](https://keri.foundation/confs/2026/videos/#fhir-and-cms-jared-jefferey&t=1751&e=1803)
  “Currently: Terms of trust on the connection, it's certificates, it's tokens it's very manual And often the org identity is assumed, not proven. They have some evidence of who you are, but not cryptographic evidence won't hold up in court” — tags: NOSHARSECR, INFRASURF, OTHUNSAFE, VERNOTVAL, LEGOVPOL
- [19:40–22:48 · Fergal O'Conner — Signify Security Architecture](https://keri.foundation/confs/2026/videos/#signify-security-architecture-fergal-o-conner&t=1180&e=1368)
  “ESSR better than signed headers for confidentiality. cryptobox seals as opposed to assymetric keys for data encryption” — tags: GRALIFCONF, SPACTRILL, MINIMSUFFI, BIZEFFCASE, SECUFIRST
- [22:08–22:39 · Keanu Pahio — KERI Development & Deployment](https://keri.foundation/confs/2026/videos/#keri-development-deployment-keanu-pahio&t=1328&e=1359)
  “Ryan - By changing witness and watcher code you're not changing the (security of) the witness code it's auxiliary code.” — tags: SECUFIRST, VERNOTVAL, AGNOSTIC, MINIMSUFFI

## Alex — End User / Privacy Advocate

> Your identity should belong to you for life — no usernames, no passwords, no platform that can delete you, and recourse when data about you is wrong.

Value tags: `1PERSCONTR`, `SAFETY`, `RECOUPEERS`, `GRALIFCONF`, `INCLUSIVE`, `COMMUNEDU`, `PERPETUAL`

- [16:53–19:28 · Phil Windley — Digital Identity Needs a Legal Foundation](https://keri.foundation/confs/2026/videos/#digital-identity-needs-a-legal-foundation-phil-windley&t=1013&e=1168)
  “Legal underpinnings of SEDI: bill of rights, selective disclosure, requiring open standards (not proprietary MDL, multiple wallets duty of loyalty and fiduciary requirement, wards of guardians get and within their allowed context as guardians are acting on their behalf.” — tags: AGNOSTIC, OTHUNSAFE, INCLUSIVE, SAFETY, RECOUPEERS, 1PERSCONTR
- [44:39–46:22 · Samuel Smith — State of the KERI Suite](https://keri.foundation/confs/2026/videos/#state-of-the-keri-suite-samuel-smith&t=2679&e=2782)
  “Registrar and Observer. And the reason: control over context. anti correlation via bulk issuances” — tags: 1PERSCONTR, GRALIFCONF, SAFETY
- [12:30–14:46 · George McEwan — The Landscape of SEDI](https://keri.foundation/confs/2026/videos/#the-landscape-of-sedi-george-mcewan&t=750&e=886)
  “Community education: open sourcing of privacy and other digital identity values we hope to have. Example: healthcare, where scary policies that breach human rights should become illegal. Personas are legitimate human rights” — tags: LEGOVPOL, COMMUNEDU, RECOUPEERS, 1PERSCONTR
- [49:12–51:33 · Samuel Smith — State of the KERI Suite](https://keri.foundation/confs/2026/videos/#state-of-the-keri-suite-samuel-smith&t=2952&e=3093)
  “Identity revolution, Reputable Autonomic Pseudonymity Control Confidential Contexts Private vs. Confidential RAP-C3 Rhapsody - An enthusiastic, emotionally expressive outpouring” — tags: PERPETUAL, 1PERSCONTR, GRALIFCONF, SPACTRILL
- [7:23–9:44 · Ned Smith — Secure Asset Transfer Protocol](https://keri.foundation/confs/2026/videos/#secure-asset-transfer-protocol-ned-smith&t=443&e=584)
  “SATP Archtecture: an atomic decentralized two-phase commit protocol, Canonical identifier, the attributes that are in common have to be negotiated or created as part of the protocol provenenced asset transfers asset versioning pinning and roll back” — tags: ATSCALE, GRALIFCONF, UNBROCHAIN, INCLUSIVE, PERPETUAL

