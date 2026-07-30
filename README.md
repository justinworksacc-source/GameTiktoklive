# Gift Dash — TikTok LIVE Gift Race

An OBS-ready browser race where each TikTok LIVE gift boosts its assigned racer.

## Start

```bash
npm install
npm start
```

Open `http://localhost:3000`, click the gear, and copy the TikFinity webhook URL.

For OBS, add a Browser Source using `http://localhost:3000` at 1920×1080.

## Configure gifts

Open the settings drawer to change a racer's gift name. Gift names must match
TikTok's displayed English gift name exactly. Settings are saved in the browser.
Click a gift card in the lower dock to test it without going LIVE.

The six defaults—Rose, GG, You're awesome, Clap Clap, Pop, and Freestyle—are
each 1 coin in the supplied TikTok gift catalog. Every racer gets the same fixed
+10 movement per gift, so the race stays fair.

Streak gifts are applied only once when the streak finishes, multiplied by the
final repeat count.

## TikFinity connection

In TikFinity, create an action, enable **Trigger Webhook**, and use:

```text
http://COMPUTER-IP:3000/api/tikfinity/gift?giftName={giftname}&repeatCount={repeatcount}&sender={username}&coins={coins}
```

Create a TikFinity gift event that triggers this action for every gift. Do not
enable repeated execution for intermediate combo updates; `{repeatcount}` already
contains the combo quantity. The endpoint accepts both GET query parameters and
POST JSON/form payloads.
