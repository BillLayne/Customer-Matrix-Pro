
import { COLORS, SOCIAL_LINKS } from '../constants';
import { EmailState } from '../types';

// ============================================================
// buildEmailWrapper — 2026 Bill Layne Gmail Design System
// Wraps AI-generated body content in the agency's standard
// Gmail-safe, mobile-first HTML shell.
// ============================================================
export const buildEmailWrapper = (state: EmailState, aiContent: string) => {
  const {
    agencyName,
    agencyPhone,
    totalInvestment,
    monthlyPayment,
    sixMonthPayment,
    annualPayment,
    paymentNote,
    customHeroImage,
    preheaderText,
    carrierLogoUrl,
    templateType,
  } = state;

  // ── Brand tokens ──────────────────────────────────────────
  const logoUrl      = 'https://i.imgur.com/lxu9nfT.png';
  const fontStack    = "'Inter', Arial, 'Helvetica Neue', Helvetica, sans-serif";
  const navyPrimary  = '#003f87';
  const navyDark     = '#0f172a';
  const navyMid      = '#1a365d';
  const teal         = '#0f766e';
  const gold         = '#C8A84E';
  const green        = '#059669';
  const bgOuter      = '#f8fafc';   // outer page background (was incorrectly #f1f5f9)
  const cardFafa     = '#fafafa';   // outer card / footer bg
  const cardWhite    = '#ffffff';   // inner content card bg
  const textDark     = '#0f172a';
  const textMuted    = '#64748b';
  const border       = '#e2e8f0';

  // ── Helpers ───────────────────────────────────────────────
  const isQuote    = templateType === 'quote';
  const isWelcome  = templateType === 'welcome';
  const isRenewal  = templateType === 'renewal';
  const isReceipt  = templateType === 'receipt';
  const isCancel   = templateType === 'cancellation';
  const isSales    = isQuote || isWelcome || isRenewal;

  // ── 1. HEADER ─────────────────────────────────────────────
  // Dual-logo standard: gradient accent bar + agency pill + carrier pill + sub-labels
  // Single-logo fallback when no carrier is present.
  let headerSection = '';
  if (carrierLogoUrl) {
    headerSection = `
    <!-- ══ HEADER: Dual Logo ══ -->
    <tr>
      <td bgcolor="${cardFafa}" style="background-color:${cardFafa};border-radius:0;padding:0;">
        <!-- Gradient accent bar -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td height="4" style="height:4px;background:linear-gradient(90deg,${navyPrimary} 0%,${gold} 100%);background-color:${navyPrimary};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
        <!-- Logo row -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <!-- Agency logo pill -->
            <td class="stack" width="47%" align="center" valign="middle" style="padding:20px 20px 16px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${cardWhite}" style="background-color:${cardWhite};border:1px solid ${border};border-radius:8px;padding:10px 16px;">
                    <img src="${logoUrl}" alt="${agencyName || 'Bill Layne Insurance Agency'}" width="140" height="auto" style="display:block;width:140px;height:auto;max-width:140px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:6px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:${textMuted};font-family:${fontStack};letter-spacing:1px;text-transform:uppercase;mso-line-height-rule:exactly;">Your Independent Agency</p>
                  </td>
                </tr>
              </table>
            </td>
            <!-- Vertical divider — hidden on mobile -->
            <td class="mobile-hide" width="6%" align="center" style="border-left:1px solid ${border};">&nbsp;</td>
            <!-- Carrier logo pill -->
            <td class="stack" width="47%" align="center" valign="middle" style="padding:20px 20px 16px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${cardWhite}" style="background-color:${cardWhite};border:1px solid ${border};border-radius:8px;padding:10px 16px;">
                    <img src="${carrierLogoUrl}" alt="Carrier Logo" width="120" height="auto" style="display:block;width:120px;height:auto;max-width:120px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:6px;">
                    <p style="margin:0;font-size:10px;font-weight:700;color:${textMuted};font-family:${fontStack};letter-spacing:1px;text-transform:uppercase;mso-line-height-rule:exactly;">Your Quoted Carrier</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  } else {
    headerSection = `
    <!-- ══ HEADER: Agency Single Logo ══ -->
    <tr>
      <td bgcolor="${cardFafa}" style="background-color:${cardFafa};padding:0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td height="4" style="height:4px;background:linear-gradient(90deg,${navyPrimary} 0%,${gold} 100%);background-color:${navyPrimary};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding:24px 20px 20px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${cardWhite}" class="logo-mobile" style="background-color:${cardWhite};border:1px solid ${border};border-radius:8px;padding:10px 20px;">
                    <img src="${logoUrl}" alt="${agencyName || 'Bill Layne Insurance Agency'}" width="160" height="auto" style="display:block;width:160px;height:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  // ── 2. HERO ───────────────────────────────────────────────
  // Context-aware hero: gradient for sales, solid colors for transactional types.
  let heroSection = '';
  if (customHeroImage) {
    heroSection = `
    <!-- ══ HERO: Custom Image ══ -->
    <tr>
      <td bgcolor="${cardWhite}" style="background-color:${cardWhite};padding:0;">
        <img src="${customHeroImage}" alt="Hero" width="600" style="display:block;width:100%;max-width:600px;height:auto;" />
      </td>
    </tr>`;
  } else {
    // Pick hero background based on template type
    const heroBg = isCancel
      ? `background-color:#f59e0b;background:#f59e0b;`
      : isReceipt
      ? `background-color:${green};background:${green};`
      : isSales
      ? `background-color:${navyDark};background:linear-gradient(135deg,${navyDark} 0%,${navyMid} 50%,${teal} 100%);`
      : `background-color:${navyPrimary};background:${navyPrimary};`;

    const heroEmoji = isQuote ? '🚗' : isWelcome ? '🎉' : isRenewal ? '🔁' : isReceipt ? '💳' : isCancel ? '⚠️' : '📋';
    const heroHeading = isQuote
      ? 'Your Insurance Quote Is Ready'
      : isWelcome
      ? 'Welcome to Bill Layne Insurance!'
      : isRenewal
      ? 'Your Renewal Is Ready to Review'
      : isReceipt
      ? 'Payment Received'
      : isCancel
      ? 'Important Notice About Your Policy'
      : 'Important Update';

    heroSection = `
    <!-- ══ HERO: Gradient / Solid ══ -->
    <tr>
      <td class="mobile-pad-hero" style="padding:40px 40px;${heroBg}text-align:center;">
        <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:${gold};font-family:${fontStack};letter-spacing:1.5px;text-transform:uppercase;mso-line-height-rule:exactly;">${heroEmoji} Bill Layne Insurance Agency</p>
        <h1 class="hero-h1" style="margin:0;color:#ffffff;font-family:${fontStack};font-size:26px;font-weight:700;line-height:32px;mso-line-height-rule:exactly;">${heroHeading}</h1>
      </td>
    </tr>`;
  }

  // ── 3. PREMIUM DISPLAY ─────────────────────────────────────
  // Auto/renewal: monthly = hero number. Home/property: annual = hero number.
  // If monthlyPayment is provided, use that as the primary display for auto.
  // If only annualPayment is provided (no monthly), treat as property/home template.
  let premiumSection = '';
  const showMonthly   = !!(monthlyPayment || sixMonthPayment);
  const showAnnual    = !!annualPayment;
  const showTotal     = !!totalInvestment && !showMonthly && !showAnnual;

  if (showMonthly) {
    // Auto-style: monthly as hero big number
    const monthlyVal    = monthlyPayment    || '—';
    const sixMonthVal   = sixMonthPayment   || '—';
    premiumSection = `
    <!-- ══ PREMIUM: Auto Monthly Display ══ -->
    <tr>
      <td bgcolor="${cardWhite}" style="background-color:${cardWhite};padding:0 32px 32px 32px;" class="mobile-pad-card">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
          style="background-color:${navyDark};border-radius:16px;border:1px solid ${border};">
          <tr>
            <td align="center" style="padding:24px 24px 8px 24px;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:${gold};font-family:${fontStack};letter-spacing:1.5px;text-transform:uppercase;mso-line-height-rule:exactly;">EST. MONTHLY PAYMENT</p>
              <p class="amount-xl" style="margin:0;font-size:40px;font-weight:700;color:#ffffff;font-family:${fontStack};line-height:1.1;mso-line-height-rule:exactly;">${monthlyVal}<span style="font-size:16px;font-weight:400;">/mo</span></p>
              ${sixMonthVal !== '—' ? `<p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.75);font-family:${fontStack};mso-line-height-rule:exactly;">${sixMonthVal} &bull; 6-month term</p>` : ''}
              <p style="margin:8px 0 0 0;font-size:11px;font-style:italic;color:rgba(255,255,255,0.55);font-family:${fontStack};mso-line-height-rule:exactly;">*Installment schedule and service fees may vary by carrier</p>
            </td>
          </tr>
          ${paymentNote ? `<tr><td align="center" style="padding:0 24px 16px 24px;"><p style="margin:0;font-size:12px;font-style:italic;color:rgba(255,255,255,0.65);font-family:${fontStack};mso-line-height-rule:exactly;">${paymentNote}</p></td></tr>` : ''}
          <tr><td style="height:16px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>`;
  } else if (showAnnual) {
    // Property-style: annual as hero big number
    const annualVal = annualPayment || '—';
    premiumSection = `
    <!-- ══ PREMIUM: Property Annual Display ══ -->
    <tr>
      <td bgcolor="${cardWhite}" style="background-color:${cardWhite};padding:0 32px 32px 32px;" class="mobile-pad-card">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
          style="background-color:${navyDark};border-radius:16px;border:1px solid ${border};">
          <tr>
            <td align="center" style="padding:24px 24px 8px 24px;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:${gold};font-family:${fontStack};letter-spacing:1.5px;text-transform:uppercase;mso-line-height-rule:exactly;">ANNUAL PREMIUM</p>
              <p class="amount-xl" style="margin:0;font-size:40px;font-weight:700;color:#ffffff;font-family:${fontStack};line-height:1.1;mso-line-height-rule:exactly;">${annualVal}<span style="font-size:16px;font-weight:400;">/yr</span></p>
            </td>
          </tr>
          ${paymentNote ? `<tr><td align="center" style="padding:0 24px 16px 24px;"><p style="margin:0;font-size:12px;font-style:italic;color:rgba(255,255,255,0.65);font-family:${fontStack};mso-line-height-rule:exactly;">${paymentNote}</p></td></tr>` : ''}
          <tr><td style="height:16px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>`;
  } else if (showTotal) {
    // Fallback: total investment display
    premiumSection = `
    <!-- ══ PREMIUM: Total Investment ══ -->
    <tr>
      <td bgcolor="${cardWhite}" style="background-color:${cardWhite};padding:0 32px 24px 32px;" class="mobile-pad-card">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
          style="background-color:${bgOuter};border-radius:12px;border:1px solid ${border};">
          <tr>
            <td align="center" style="padding:16px 24px;">
              <p style="margin:0;font-size:14px;color:${textDark};font-weight:700;font-family:${fontStack};mso-line-height-rule:exactly;">
                Total: <span style="color:${navyPrimary};font-size:20px;">${totalInvestment}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  // ── 4. MESSENGER BUTTON / LINK ────────────────────────────
  // Outlined navy button for quotes/welcome/renewal; inline text otherwise.
  let messengerBlock = '';
  if (isSales) {
    messengerBlock = `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-top:16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border:2px solid ${navyPrimary};border-radius:8px;background-color:${cardWhite};padding:12px 28px;">
                    <a href="https://m.me/dollarbillagency" style="font-size:14px;font-weight:700;color:${navyPrimary};text-decoration:none;font-family:${fontStack};">💬 Chat on Messenger</a>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0 0;font-size:11px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">Available Mon–Fri 9am–5pm &nbsp;|&nbsp; We reply within 1 business hour.</p>
            </td>
          </tr>
        </table>`;
  } else {
    messengerBlock = `
        <p style="margin:16px 0 0 0;text-align:center;font-size:13px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">
          Questions? <a href="https://m.me/dollarbillagency" style="color:${navyPrimary};font-weight:700;text-decoration:none;">Chat on Messenger</a>
        </p>`;
  }

  // ── 5. CTA SECTION ────────────────────────────────────────
  // Context-aware first-person copy. Gold CTA for sales, phone-green for transactional.
  const ctaLabel = isQuote
    ? 'Lock In My Rate →'
    : isWelcome
    ? 'Get My ID Cards →'
    : isRenewal
    ? 'Review My Renewal →'
    : isReceipt
    ? 'View My Policy →'
    : 'Call Our Elkin Office';

  const ctaBg   = isSales ? gold : (isReceipt ? green : navyPrimary);
  const ctaText = isSales ? navyDark : '#ffffff';

  const ctaSection = `
    <!-- ══ CTA ══ -->
    <tr>
      <td bgcolor="${cardWhite}" align="center" style="background-color:${cardWhite};padding:8px 32px 40px 32px;">
        ${isSales ? `<p style="margin:0 0 16px 0;font-size:13px;font-style:italic;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">Questions about your rate or coverage options? Just reply to this email — I review every message personally. &mdash; Bill Layne</p>` : ''}
        ${isQuote ? `<p style="margin:0 0 16px 0;font-size:12px;color:#f59e0b;font-weight:700;font-family:${fontStack};mso-line-height-rule:exactly;">⚡ Coverage begins on your selected effective date</p>` : ''}
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius:8px;background-color:${ctaBg};">
              <a href="tel:${agencyPhone || '3368351993'}" style="display:inline-block;padding:16px 44px;font-size:16px;font-weight:700;color:${ctaText};text-decoration:none;font-family:${fontStack};mso-line-height-rule:exactly;">${ctaLabel}</a>
            </td>
          </tr>
        </table>
        ${messengerBlock}
      </td>
    </tr>`;

  // ── 6. FOOTER ─────────────────────────────────────────────
  // Full 8-step footer sequence. Agent chip is PERMANENTLY removed.
  const showMessengerFooter = !isReceipt;

  const footerSection = `
    <!-- ══ FOOTER SEQUENCE ══ -->
    <tr>
      <td bgcolor="${cardFafa}" style="background-color:${cardFafa};padding:28px 24px 24px 24px;text-align:center;border-top:1px solid ${border};">

        <!-- 1. Gold accent line -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px auto;">
          <tr><td height="3" width="70" bgcolor="${gold}" style="height:3px;width:70px;background-color:${gold};font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>

        <!-- 2. Agency logo in white wrapper -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px auto;">
          <tr>
            <td bgcolor="${cardWhite}" style="background-color:${cardWhite};border:1px solid ${border};border-radius:10px;padding:10px 18px;">
              <img src="${logoUrl}" alt="Bill Layne Insurance Agency" width="120" height="40" style="display:block;width:120px;height:40px;" />
            </td>
          </tr>
        </table>

        <!-- 3. Address / contact -->
        <p style="margin:0 0 3px 0;font-size:14px;font-weight:700;color:${textDark};font-family:${fontStack};mso-line-height-rule:exactly;">Bill Layne Insurance Agency</p>
        <p style="margin:0 0 3px 0;font-size:13px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">1283 N Bridge St &bull; Elkin, NC 28621</p>
        <p style="margin:0 0 3px 0;font-size:13px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">
          <a href="tel:336-835-1993" style="color:${navyPrimary};text-decoration:none;font-weight:700;">(336) 835-1993</a>
          &nbsp;&bull;&nbsp;
          <a href="mailto:Save@BillLayneInsurance.com" style="color:${navyPrimary};text-decoration:none;font-weight:700;">Save@BillLayneInsurance.com</a>
        </p>
        <p style="margin:0 0 16px 0;font-size:12px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">
          <a href="https://www.BillLayneInsurance.com" style="color:${navyPrimary};text-decoration:none;font-weight:700;">www.BillLayneInsurance.com</a>
          &nbsp;&bull;&nbsp;Est. 2005
        </p>

        <!-- 4. Social row (plain text pipes) -->
        <p style="margin:0 0 16px 0;font-size:12px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">
          <a href="https://www.facebook.com/dollarbillagency" style="color:${navyPrimary};text-decoration:none;font-weight:700;">Facebook</a>
          &nbsp;|&nbsp;
          <a href="https://www.youtube.com/@ncautoandhome" style="color:${navyPrimary};text-decoration:none;font-weight:700;">YouTube</a>
          &nbsp;|&nbsp;
          <a href="https://www.instagram.com/ncautoandhome" style="color:${navyPrimary};text-decoration:none;font-weight:700;">Instagram</a>
          &nbsp;|&nbsp;
          <a href="https://x.com/shopsavecompare" style="color:${navyPrimary};text-decoration:none;font-weight:700;">X (Twitter)</a>
        </p>

        <!-- 5. Google rating badge -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px auto;">
          <tr>
            <td bgcolor="${cardWhite}" style="background-color:${cardWhite};border:1px solid ${border};border-radius:8px;padding:8px 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;vertical-align:middle;">
                    <img src="https://i.imgur.com/nDFmjxh.png" width="20" height="20" alt="Google" style="display:block;width:20px;height:20px;" />
                  </td>
                  <td valign="middle">
                    <p style="margin:0;font-size:12px;font-weight:700;color:${textDark};font-family:${fontStack};mso-line-height-rule:exactly;">4.9 &#11088; on Google Reviews</p>
                    <p style="margin:2px 0 0 0;font-size:11px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">100+ client reviews</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- 6. Facebook follow line -->
        <p style="margin:0 0 8px 0;font-size:11px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">
          Follow us on <a href="https://www.facebook.com/dollarbillagency" style="color:${navyPrimary};text-decoration:none;font-weight:700;">Facebook</a> for insurance tips and local updates.
        </p>

        <!-- 7. Messenger opt-in (non-receipt templates) -->
        ${showMessengerFooter ? `<p style="margin:0 0 14px 0;font-size:11px;color:${textMuted};font-family:${fontStack};mso-line-height-rule:exactly;">
          Prefer to chat? Reach us on <a href="https://m.me/dollarbillagency" style="color:${navyPrimary};text-decoration:none;font-weight:700;">Facebook Messenger</a>.
        </p>` : ''}

        <!-- 8. Unsubscribe / compliance -->
        <p style="margin:0;font-size:10px;color:#94a3b8;line-height:1.6;font-family:${fontStack};mso-line-height-rule:exactly;">
          You are receiving this because you have an active policy or requested a quote from Bill Layne Insurance Agency.<br />
          To unsubscribe, reply with &quot;unsubscribe&quot; or call (336) 835-1993.
        </p>
      </td>
    </tr>`;

  // ── ASSEMBLE FULL HTML ─────────────────────────────────────
  let finalHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Bill Layne Insurance Agency</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <script type="application/ld+json">
    {"@context":"http://schema.org","@type":"EmailMessage","sender":{"@type":"Organization","name":"Bill Layne Insurance Agency","url":"https://www.BillLayneInsurance.com","telephone":"+13368351993","address":{"@type":"PostalAddress","streetAddress":"1283 N Bridge St","addressLocality":"Elkin","addressRegion":"NC","postalCode":"28621"}}}
  </script>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse!important;}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    body{margin:0!important;padding:0!important;width:100%!important;background-color:${bgOuter};}
    p{margin:0;mso-line-height-rule:exactly;}
    @media screen and (max-width:600px){
      .container-600{width:100%!important;max-width:100%!important;}
      .mobile-pad-20{padding-left:16px!important;padding-right:16px!important;}
      .mobile-pad-hero{padding:32px 16px!important;}
      .mobile-pad-card{padding:20px 16px!important;}
      .stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;}
      .stack-right{text-align:left!important;padding-top:14px!important;}
      .hero-h1{font-size:22px!important;line-height:28px!important;}
      .amount-xl{font-size:28px!important;line-height:32px!important;}
      .label-sm{font-size:12px!important;}
      .value-md{font-size:15px!important;}
      .logo-mobile img{width:140px!important;height:auto!important;}
      .nowrap-guard{word-break:break-word!important;overflow-wrap:break-word!important;}
      .mobile-hide{display:none!important;width:0!important;max-width:0!important;overflow:hidden!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${bgOuter};">
  <!-- 600px spacer — forces Gmail to honor desktop width -->
  <div style="display:none;white-space:nowrap;font:15px courier;color:#ffffff;line-height:0;width:600px!important;min-width:600px!important;max-width:600px!important;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  <!-- Preheader text -->
  <div style="display:none;font-size:1px;color:${bgOuter};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderText || 'Important information from Bill Layne Insurance Agency.'}</div>

  <!--[if (gte mso 9)|(IE)]>
  <table cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td>
  <![endif]-->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;background-color:${bgOuter};">
    <tr>
      <td align="center" valign="top" style="padding:20px 10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container-600"
          style="width:600px;max-width:600px;margin:0 auto;background-color:${cardWhite};border:1px solid ${border};border-radius:16px;overflow:hidden;">

          ${headerSection}
          ${heroSection}
          ${premiumSection}

          <!-- ══ AI BODY CONTENT ══ -->
          <tr>
            <td bgcolor="${cardWhite}" style="background-color:${cardWhite};padding:28px 32px;color:${textDark};font-size:16px;line-height:1.6;font-family:${fontStack};" class="mobile-pad-card">
              <div style="font-family:${fontStack};">
                ${aiContent}
              </div>
            </td>
          </tr>

          ${ctaSection}
          ${footerSection}

        </table>
      </td>
    </tr>
  </table>
  <!--[if (gte mso 9)|(IE)]>
  </td></tr></table>
  <![endif]-->
</body>
</html>`;

  // ── Cloudflare corruption guard ───────────────────────────
  finalHtml = finalHtml.replace(/href="\/cdn-cgi\/l\/email-protection[^"]*"/g, 'href="mailto:Save@BillLayneInsurance.com"');

  return finalHtml;
};

// ============================================================
// Shared interfaces
// ============================================================
export interface GeneratedEmail {
  subject: string;
  htmlBody: string;
  preheader?: string;
  to?: string;
}

export interface ValidationWarning {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
}

export interface ValidationResult {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  issues: ValidationWarning[];
}

export const GMAIL_CLIP_THRESHOLD_BYTES = 102_000;

export function extractBodyContent(html: string): string {
  if (!html) return '';
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match && match[1] ? match[1] : html;
}

function extractHeadStyles(html: string): string {
  if (!html) return '';
  const styleBlocks = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  const msoBlocks   = html.match(/<!--\[if[\s\S]*?<!\[endif\]-->/gi) || [];
  return [...msoBlocks, ...styleBlocks].join('\n');
}

function extractClipboardHtml(html: string): string {
  const headStyles  = extractHeadStyles(html);
  const bodyContent = extractBodyContent(html);
  return `${headStyles}${headStyles ? '\n' : ''}${bodyContent}`.trim();
}

export function buildGmailComposeUrl(options: {
  to?: string;
  subject: string;
  bcc?: string;
}): string {
  const params = new URLSearchParams();
  params.set('view', 'cm');
  params.set('fs', '1');
  if (options.to) params.set('to', options.to);
  params.set('su', options.subject);
  // Always BCC agency address for E&O record-keeping
  params.set('bcc', options.bcc || 'Save@BillLayneInsurance.com');
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export async function copyHtmlToClipboardAsRichText(html: string): Promise<boolean> {
  if (!html) return false;
  const clipboardHtml = extractClipboardHtml(html);
  try {
    const blob = new Blob([clipboardHtml], { type: 'text/html' });
    // @ts-ignore
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    // @ts-ignore
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(clipboardHtml);
      return true;
    } catch {
      return false;
    }
  }
}

export function sanitizeFilename(subject: string, fallback = 'email'): string {
  const cleaned = (subject || '').trim().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '');
  return cleaned.length ? cleaned : fallback;
}

export function downloadAsHtmlFile(html: string, subject: string): void {
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${sanitizeFilename(subject)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printHtml(html: string): boolean {
  if (!html) return false;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}

function appendClassesToTag(tag: string, classesToAdd: string[]): string {
  if (!classesToAdd.length) return tag;

  if (/class=/i.test(tag)) {
    return tag.replace(/class=(["'])([^"']*)(\1)/i, (_match, quote: string, existing: string) => {
      const merged = new Set(
        `${existing} ${classesToAdd.join(' ')}`
          .split(/\s+/)
          .map((value) => value.trim())
          .filter(Boolean)
      );
      return `class=${quote}${Array.from(merged).join(' ')}${quote}`;
    });
  }

  return tag.replace(/^<td\b/i, `<td class="${classesToAdd.join(' ')}"`);
}

function normalizeStackClasses(html: string): string {
  let normalized = html;

  normalized = normalized.replace(/<td\b[^>]*\balign=(["'])right\1[^>]*>/gi, (tag) => {
    if (/\bstack\b/i.test(tag)) return tag;
    return appendClassesToTag(tag, ['stack', 'stack-right', 'nowrap-guard']);
  });

  normalized = normalized.replace(/<td\b[^>]*\bwidth=(["'])(47%|50%|70%)\1[^>]*>/gi, (tag) => {
    if (/\bstack\b/i.test(tag)) return tag;
    return appendClassesToTag(tag, ['stack', 'nowrap-guard']);
  });

  return normalized;
}

export function normalizeGeneratedEmailHtml(
  html: string,
  options?: { preheader?: string }
): string {
  if (!html || !html.trim()) return html;

  const preheader = options?.preheader?.trim() || 'Important information from Bill Layne Insurance Agency.';
  const jsonLdBlock = `<script type="application/ld+json">{"@context":"http://schema.org","@type":"EmailMessage","sender":{"@type":"Organization","name":"Bill Layne Insurance Agency","url":"https://www.BillLayneInsurance.com","telephone":"+13368351993","address":{"@type":"PostalAddress","streetAddress":"1283 N Bridge St","addressLocality":"Elkin","addressRegion":"NC","postalCode":"28621"}}}</script>`;

  let normalized = html.trim().replace(/^\uFEFF/, '').replace(/^<!--\s*Blank HTML\s*-->\s*/i, '');

  if (!/<!doctype/i.test(normalized)) {
    normalized = `<!DOCTYPE html>\n${normalized}`;
  }

  if (/<head[\s>]/i.test(normalized) && /<body[\s>]/i.test(normalized) && !/<html[\s>]/i.test(normalized)) {
    normalized = normalized.replace(/<!DOCTYPE html>\s*/i, '<!DOCTYPE html>\n<html lang="en">\n');
    if (!/<\/html>\s*$/i.test(normalized)) {
      normalized = `${normalized}\n</html>`;
    }
  }

  if (!/x-apple-disable-message-reformatting/i.test(normalized) && /<\/head>/i.test(normalized)) {
    normalized = normalized.replace(/<\/head>/i, `  <meta name="x-apple-disable-message-reformatting" />\n</head>`);
  }

  if (!/application\/ld\+json/i.test(normalized) && /<\/head>/i.test(normalized)) {
    normalized = normalized.replace(/<\/head>/i, `  ${jsonLdBlock}\n</head>`);
  }

  if (!/display:none[^>]*overflow:hidden/i.test(normalized) && /<body[^>]*>/i.test(normalized)) {
    normalized = normalized.replace(
      /<body([^>]*)>/i,
      `<body$1>\n<div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>`
    );
  } else {
    normalized = normalized.replace(
      /(<div[^>]*display:none[^>]*overflow:hidden[^>]*>)([\s\S]*?)(<\/div>)/i,
      (_match, openTag: string, inner: string, closeTag: string) => {
        if (/&#847;/.test(inner)) return `${openTag}${inner}${closeTag}`;
        return `${openTag}${inner}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;${closeTag}`;
      }
    );
  }

  normalized = normalizeStackClasses(normalized);

  return normalized;
}

// ============================================================
// validateGmailHtml
// Runs 2026 design-system compliance checks.
// Returns a structured result with all errors and warnings.
// ============================================================
export function validateGmailHtml(html: string): ValidationResult {
  const issues: ValidationWarning[] = [];

  if (!html || !html.trim()) {
    issues.push({ severity: 'error', rule: 'empty', message: 'HTML body is empty.' });
    return finalizeValidation(issues);
  }

  // ── ERRORS (blocking) ──────────────────────────────────────
  if (/border-radius\s*:\s*50%/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-circle-radius',
      message: 'border-radius:50% detected. PERMANENTLY BANNED — use border-radius:8px for badges and border-radius:4px for pills.',
    });
  }

  if (/XacnUW4/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-agent-chip-image',
      message: 'Deprecated agent headshot (XacnUW4) detected. Agent chip is permanently removed from all templates.',
    });
  }

  if (/Licensed Insurance Agent/i.test(html) || /Owner\s*&amp;\s*Licensed Agent/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-agent-chip-text',
      message: 'Deprecated agent signature text detected. Remove — footer warmth lives in body copy, not a chip.',
    });
  }

  if (/cdn-cgi/i.test(html) || /__cf_email__/i.test(html) || /email-protection/i.test(html) || /data-cfemail/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'cloudflare-obfuscation',
      message: 'Cloudflare email obfuscation detected. Always use literal mailto:Save@BillLayneInsurance.com.',
    });
  }

  if (/#003366/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'deprecated-navy',
      message: 'Deprecated navy #003366 detected. Current standard is #003f87.',
    });
  }

  if (/#FFC300/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'deprecated-gold',
      message: 'Deprecated gold #FFC300 detected. Current standard is #C8A84E.',
    });
  }

  const byteLength = new Blob([html]).size;
  if (byteLength > GMAIL_CLIP_THRESHOLD_BYTES) {
    issues.push({
      severity: 'error',
      rule: 'gmail-clip',
      message: `HTML is ${byteLength.toLocaleString()} bytes — exceeds Gmail's ${GMAIL_CLIP_THRESHOLD_BYTES.toLocaleString()}-byte clip threshold. Reduce content.`,
    });
  }

  if (!/Save@BillLayneInsurance\.com/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'missing-save-address',
      message: 'Save@BillLayneInsurance.com not found. Required literal mailto in footer.',
    });
  }

  // ── WARNINGS ──────────────────────────────────────────────
  if (!/fonts\.googleapis\.com.*Inter/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'inter-font',
      message: 'Inter font import not found.',
    });
  }

  const hasGmailSpacer =
    /font\s*:\s*15px\s+courier/i.test(html) &&
    /width\s*:\s*600px\s*!important/i.test(html) &&
    /min-width\s*:\s*600px\s*!important/i.test(html) &&
    /max-width\s*:\s*600px\s*!important/i.test(html) &&
    /white-space\s*:\s*nowrap/i.test(html) &&
    /display\s*:\s*none/i.test(html);

  if (!hasGmailSpacer) {
    issues.push({
      severity: 'warning',
      rule: 'gmail-spacer',
      message: '600px spacer div not detected. Required for correct Gmail desktop width.',
    });
  }

  if (!/<!--\[if\s+(gte\s+)?mso/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'outlook-mso',
      message: 'No Outlook MSO conditional comments detected.',
    });
  }

  if (/display\s*:\s*flex/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'no-flexbox',
      message: 'display:flex found. Gmail-safe layouts use tables only.',
    });
  }

  if (/display\s*:\s*grid/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'no-grid',
      message: 'display:grid found. Gmail-safe layouts use tables only.',
    });
  }

  if (/box-shadow\s*:/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'no-box-shadow',
      message: 'box-shadow found — Gmail strips this. Use borders for depth.',
    });
  }

  if (!/@media\s+(screen\s+and\s+)?\(max-width:\s*600px\)/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'mobile-media-query',
      message: 'No @media (max-width:600px) block detected. Two-column rows will not stack on mobile.',
    });
  }

  if (!/application\/ld\+json/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'json-ld',
      message: 'Schema.org JSON-LD not found. Add in <head> for Gmail inbox summaries.',
    });
  }

  if (!/x-apple-disable-message-reformatting/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'ios-reformatting',
      message: 'Missing x-apple-disable-message-reformatting meta tag (iOS fix).',
    });
  }

  if (!/role="presentation"/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'presentation-tables',
      message: 'No role="presentation" tables detected. Add to all layout tables.',
    });
  }

  if (!/class="[^"]*\bstack\b/i.test(html) && /<td[^>]*align="right"/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'stack-class',
      message: 'Right-aligned cells found without .stack class. Two-column rows may not restack on mobile.',
    });
  }

  if (/f1f5f9/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'deprecated-bg',
      message: 'Background #f1f5f9 detected. Current outer page background standard is #f8fafc.',
    });
  }

  if (/9ZWQsAS/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'natgen-logo-url',
      message: 'Old National General logo URL detected (9ZWQsAS). Use HF8oPAF instead.',
    });
  }

  return finalizeValidation(issues);
}

function finalizeValidation(issues: ValidationWarning[]): ValidationResult {
  const errorCount   = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  return { passed: errorCount === 0, errorCount, warningCount, issues };
}

export async function handOffToGmail(email: GeneratedEmail): Promise<{
  copied: boolean;
  opened: boolean;
  validation: ValidationResult;
}> {
  const validation = validateGmailHtml(email.htmlBody);
  const copied     = await copyHtmlToClipboardAsRichText(email.htmlBody);

  let opened = false;
  if (copied) {
    const url = buildGmailComposeUrl({ to: email.to, subject: email.subject });
    const win = window.open(url, '_blank');
    opened    = Boolean(win);
  }

  return { copied, opened, validation };
}
