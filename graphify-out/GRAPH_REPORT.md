# Graph Report - .  (2026-07-11)

## Corpus Check
- 99 files · ~45,569 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 297 nodes · 456 edges · 24 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `generateContent()` - 5 edges
2. `generateAIOutagePost()` - 5 edges
3. `generateAITrendPost()` - 5 edges
4. `generateAIPerformancePost()` - 5 edges
5. `generateWeeklyBlogContent()` - 5 edges
6. `loadTeam()` - 4 edges
7. `createSignedJwt()` - 4 edges
8. `bulkCreateFromUrls()` - 4 edges
9. `wrapContent()` - 4 edges
10. `generateAIBlogContent()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (2): initI18n(), loadResources()

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (4): handleDelete(), handleSubmit(), loadGroups(), resetForm()

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (0): 

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (10): handleCreate(), handleDelete(), loadKeys(), handleCreate(), handleDelete(), loadHeartbeats(), handleCreateTeam(), handleInvite() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (11): base64url(), buildRawMessage(), createSignedJwt(), getAccessToken(), importPrivateKey(), sendViaGmail(), sendSlowResponseNotification(), sendStatusNotification() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (1): ApiError

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (4): handleScheduled(), handleTurkeyChecks(), checkSSLCertificate(), checkSSLExpiry()

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (2): handlePing(), loadData()

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (5): formatDate(), generatePerformancePost(), generateTrendPost(), generateWeeklyBlogContent(), generateWeeklyOutagePost()

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (4): bufferToHex(), hashPassword(), hexToBuffer(), verifyPassword()

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (4): bulkCreateFromPathBuilder(), bulkCreateFromUrls(), extractNameFromUrl(), getRemainingMonitorSlots()

### Community 11 - "Community 11"
Cohesion: 0.58
Nodes (8): cleanAIOutput(), generateAIBlogContent(), generateAIOutagePost(), generateAIPerformancePost(), generateAITrendPost(), generateContent(), previewAIBlogContent(), wrapContent()

### Community 12 - "Community 12"
Cohesion: 0.32
Nodes (3): getMonitor(), toggleMonitor(), updateMonitor()

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (2): getGroup(), updateGroup()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (2): createTeam(), getTeam()

### Community 15 - "Community 15"
Cohesion: 0.47
Nodes (3): createApiKey(), hashKey(), validateApiKey()

### Community 16 - "Community 16"
Cohesion: 0.6
Nodes (4): base64UrlDecode(), base64UrlEncode(), signJWT(), verifyJWT()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 17`** (1 nodes): `validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 7` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._