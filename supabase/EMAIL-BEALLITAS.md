# Belépés e-mail kóddal: Supabase és Resend beállítása

Ezt egyszer kell végigcsinálni. A projekt: **sidequest**
(`qkmzfccvpgymejgmvlin`), nem a régi Sidequest-mozi.

Fontos: a Supabase a sablonokat **csak saját SMTP mellett** engedi
szerkeszteni, az alap sablon pedig linket küld, nem kódot. Ezért a sorrend:
SQL, beállítások, **Resend (4–6. pont)**, és csak utána a sablon (3. pont).
Amíg a sablon nincs átírva, a kódos belépés nem működik.

Állapot: az 1. és 2. pont kész (az SQL lefutott és ellenőrizve, a kód 6
jegyű, 10 percig érvényes).

## 1. Az adatbázis

Supabase dashboard → **SQL Editor** → New query → másold be a
`supabase/fiok.sql` teljes tartalmát → **Run**. Többször is lefuttatható.

## 2. Belépési beállítások

**Authentication → Sign In / Providers → Email**

- Enable Email provider: **be**
- Confirm email: **be** (maradhat)
- **Email OTP Length: 6**
- **Email OTP Expiration: 600** másodperc (10 perc). Ha mást állítasz, a
  sablonban is írd át a „10 percig” részt.

**Authentication → Sessions** (ha van ilyen menü a csomagodban): a
„Time-box user sessions” és az „Inactivity timeout” maradjon kikapcsolva.
Így a belépés hosszú távon megmarad, a token magától frissül.

## 3. Az e-mail sablonok

**Authentication → Emails → Templates.** Két sablon van, mert az új
regisztrációnál a Supabase a „Confirm signup”, a visszatérő usernél a
„Magic Link” sablont küldi. Mindkettőben a `{{ .Token }}` legyen benne
(pontosan így), és a `{{ .ConfirmationURL }}` **ne**.

A legtöbben nem nyitják meg a levelet, csak az értesítést látják (feladó,
tárgy, előnézet), vagy az iOS a billentyűzet fölött felajánlja a kódot.
Ezért a kód áll a tárgy elején, és az előnézet a HTML első szövege.

| Sablon | Subject | Body (Source nézetben, a teljes fájl) |
|---|---|---|
| Confirm signup | `{{ .Token }} a kódod 🔑` | `supabase/email/regisztracio.html` |
| Magic Link | `{{ .Token }} a belépőkódod` | `supabase/email/belepes.html` |

A feladó neve (**SideQuest**) az SMTP beállításoknál van (6. pont), a cím
marad `noreply@sidequestbp.hu`. A logó a már élő
`https://sidequestbp.hu/sidequest-logo-atlatszo.png`; kép nélkül a
„SideQuest” felirat látszik helyette.

Mentsd el mindkettőt.

> A beépített e-mail-küldés ehhez nem elég: a sablonját nem lehet
> átírni, ezért mindenképp linket küld. A Resend tehát nem utólagos lépés.

## 4. Resend: domain

1. Regisztrálj a [resend.com](https://resend.com) oldalon.
2. **Domains → Add Domain** → `sidequestbp.hu`, régiónak válaszd az
   **EU (Ireland)** lehetőséget.
3. A Resend kiír 3–4 DNS rekordot (MX és TXT a `send` aldomainen, egy DKIM
   TXT a `resend._domainkey` néven). Az értékeket onnan másold, ne innen.

### A rekordok felvétele a Rackhostnál

rackhost.hu → belépés → Domainek → sidequestbp.hu → **Rekordok
szerkesztése** (zóna: rackhost.hu/dnsZone/342623).

**Buktató:** a hosztnév mezőhöz a Rackhost magától hozzáírja a domaint.
Csak az előtagot írd be:

| Resend ezt mutatja | Rackhost hosztnév mezőbe ezt írd |
|---|---|
| `send.sidequestbp.hu` | `send` |
| `resend._domainkey.sidequestbp.hu` | `resend._domainkey` |

Ha ide a teljes nevet írnád, `send.sidequestbp.hu.sidequestbp.hu` lenne
belőle, és a Resend sosem találná meg.

A meglévő rekordokhoz (a négy GitHub Pages A rekord és a `www` CNAME)
**ne nyúlj**. A Resend rekordjai a `send` aldomainen vannak, nem ütköznek
velük.

Ajánlott még egy DMARC rekord: típus TXT, hosztnév `_dmarc`, érték
`v=DMARC1; p=none;`

4. Vissza a Resendbe → **Verify DNS Records**. Pár perc, néha egy óra.
   Akkor kész, ha minden sor zöld.

## 5. Resend: API kulcs

**API Keys → Create API Key**

- Permission: **Sending access**
- Domain: **sidequestbp.hu**

A kulcsot csak egyszer mutatja, rögtön másold ki. Ez nem kerül a
kódba és a GitHubra sem, csak a Supabase-be.

## 6. Supabase: saját SMTP

**Authentication → Emails → SMTP Settings** → Enable custom SMTP: **be**

| Mező | Érték |
|---|---|
| Sender email | `noreply@sidequestbp.hu` |
| Sender name | `SideQuest` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a Resend API kulcs |

Save.

## 7. Küldési korlát

**Authentication → Rate Limits → Rate limit for sending emails.** Saját
SMTP után alapból óránként 30. Kezdésnek állítsd **100**-ra, később a
forgalom szerint emeld.

## 8. Próba

Lépj be az oldalon egy olyan címmel, ami nem tagja a Supabase
szervezetnek (például egy barátodéval). Ha megjön a magyar levél a 6 jegyű
kóddal `noreply@sidequestbp.hu` feladóval, kész.
