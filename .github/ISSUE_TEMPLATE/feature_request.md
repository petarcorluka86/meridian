---
name: Feature request
about: Something the app should do that it does not
title: ''
labels: enhancement
assignees: ''
---

## The problem

<!-- What you were trying to do, and where it stopped. Describe the situation
     rather than the solution — the situation is the part only you know. -->

## What you would like instead

## What you do today to work around it

## Where it would live

<!-- Which screen, or which command. If it needs a new screen, say so — that is
     a bigger conversation. -->

## Does it need new data?

<!-- Does it need a new file in the vault, a new field in an existing one, or a
     request to a source? A field that repeats something the folder structure
     already says will be declined. -->

## Please confirm you have read these

- [ ] It needs no database. The vault filesystem is the only store.
- [ ] It needs no write to BambooHR, Google or GitHub. Every request those
      integrations make is a `GET`, and that is a promise the project makes to
      its users rather than a default that can be changed.
- [ ] It needs no new outbound host. Adding one is a product decision, not an
      implementation detail.
- [ ] Nothing derived would be written to disk — counts, balances and
      days-since are recomputed, so they cannot drift.

<!-- A request that fails one of these is still worth filing. Say which one and
     why it is worth it anyway. -->
