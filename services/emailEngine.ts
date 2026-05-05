
import { COLORS, SOCIAL_LINKS } from '../constants';
import { EmailState } from '../types';

export const buildEmailWrapper = (state: EmailState, aiContent: string) => {
  const { agencyName, agencyPhone, totalInvestment, monthlyPayment, sixMonthPayment, annualPayment, paymentNote, customHeroImage, preheaderText, carrierLogoUrl, templateType } = state;
  const logoUrl = 'https://i.imgur.com/lxu9nfT.png';
  const fontStack = "'Inter', Arial, 'Helvetica Neue', Helvetica, sans-serif";
  const primaryBlue = "#003f87";
  const secondaryBlue = "#0076d3";
  const green = "#10b981";
  const bgGray = "#f1f5f9";
  const cardBg = "#ffffff";
  const textDark = "#0f172a";
  const textMuted = "#64748b";

  let headerSection = '';
  if (carrierLogoUrl) {
    headerSection = `
          <!-- HEADER: Dual Logo -->
          <tr>
            <td align="center" style="padding: 32px 40px; background-color: ${cardBg};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="48%" align="left">
                    <img src="${logoUrl}" alt="${agencyName}" width="160" style="display: block; max-width: 100%;" />
                  </td>
                  <td width="4%"></td>
                  <td width="48%" align="right">
                    <img src="${carrierLogoUrl}" alt="Carrier Logo" width="140" style="display: block; max-width: 100%;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    `;
  } else {
    headerSection = `
          <!-- HEADER: Single Logo -->
          <tr>
            <td align="center" style="padding: 32px 40px; background-color: ${cardBg};">
              <img src="${logoUrl}" alt="${agencyName}" width="200" style="display: block; margin: 0 auto; max-width: 100%;" />
            </td>
          </tr>
    `;
  }

  let heroSection = '';
  if (customHeroImage) {
      heroSection = `
          <!-- HERO IMAGE -->
          <tr>
            <td align="center" style="background-color: ${cardBg}; padding: 0;">
              <img src="${customHeroImage}" alt="Campaign Hero" width="600" style="display: block; width: 100%; max-width: 600px; height: auto;" />
            </td>
          </tr>
      `;
  } else {
      heroSection = `
          <!-- HERO GRADIENT -->
          <tr>
            <td align="center" style="padding: 40px 40px; background: linear-gradient(135deg, ${primaryBlue} 0%, ${secondaryBlue} 100%); background-color: ${primaryBlue};">
              <h1 style="margin: 0; color: #ffffff; font-family: ${fontStack}; font-size: 28px; font-weight: 900; line-height: 1.2;">
                ${templateType === 'quote' ? 'Your Insurance Proposal' : 'Important Agency Update'}
              </h1>
            </td>
          </tr>
      `;
  }

  let paymentSection = '';

  if (monthlyPayment || sixMonthPayment || annualPayment) {
    paymentSection = `
          <!-- PAYMENT GRID -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: ${cardBg};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                <tr>
                  <td align="center" style="padding: 24px 0 16px 0; color: ${textDark}; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-family: ${fontStack};">
                    Investment Options
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 24px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Monthly -->
                        <td width="32%" valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                            <tr>
                              <td align="center" style="padding: 16px 8px;">
                                <div style="font-size: 11px; font-weight: bold; color: ${textMuted}; text-transform: uppercase; margin-bottom: 4px; font-family: ${fontStack};">Monthly</div>
                                <div style="font-size: 20px; font-weight: bold; color: ${textDark}; font-family: ${fontStack};">${monthlyPayment || '---'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="2%"></td>
                        <!-- 6-Month -->
                        <td width="32%" valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${primaryBlue}; border-radius: 12px; border: 1px solid ${primaryBlue};">
                            <tr>
                              <td align="center" style="padding: 16px 8px;">
                                <div style="font-size: 11px; font-weight: bold; color: #ffffff; opacity: 0.8; text-transform: uppercase; margin-bottom: 4px; font-family: ${fontStack};">6-Month</div>
                                <div style="font-size: 20px; font-weight: bold; color: #ffffff; font-family: ${fontStack};">${sixMonthPayment || '---'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="2%"></td>
                        <!-- Annual -->
                        <td width="32%" valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                            <tr>
                              <td align="center" style="padding: 16px 8px;">
                                <div style="font-size: 11px; font-weight: bold; color: ${textMuted}; text-transform: uppercase; margin-bottom: 4px; font-family: ${fontStack};">Annual</div>
                                <div style="font-size: 20px; font-weight: bold; color: ${textDark}; font-family: ${fontStack};">${annualPayment || '---'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ${paymentNote ? `
                    <div style="margin-top: 16px; text-align: center; color: ${textMuted}; font-size: 12px; font-style: italic; font-family: ${fontStack};">
                      ${paymentNote}
                    </div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    `;
  } else if (totalInvestment) {
    paymentSection = `
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: ${cardBg};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
                <tr>
                  <td align="center" style="color: ${textDark}; font-weight: bold; font-size: 14px; font-family: ${fontStack};">
                    Total Investment: <span style="color: ${primaryBlue}; font-size: 18px;">${totalInvestment}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
  }

  let messengerLink = '';
  if (templateType === 'quote' || templateType === 'welcome' || templateType === 'renewal') {
    messengerLink = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding-top: 24px;">
            <a href="https://m.me/dollarbillagency" style="display: inline-block; padding: 14px 32px; border: 2px solid ${primaryBlue}; background-color: ${cardBg}; color: ${primaryBlue}; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 10px; font-family: ${fontStack};">
              Chat with us on Messenger
            </a>
          </td>
        </tr>
      </table>
    `;
  } else {
    messengerLink = `
      <p style="text-align:center; font-size:13px; color:${textMuted}; font-family:${fontStack}; margin-top: 24px; margin-bottom: 0;">
        Questions? <a href="https://m.me/dollarbillagency" style="color:${primaryBlue}; font-weight:bold; text-decoration:none;">Chat with us on Messenger</a>
      </p>
    `;
  }

  let finalHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <script type="application/ld+json">
    {"@context":"http://schema.org","@type":"EmailMessage","sender":{"@type":"Organization","name":"Bill Layne Insurance Agency","url":"https://www.BillLayneInsurance.com","telephone":"+13368351993"}}
  </script>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: ${fontStack}; background-color: ${bgGray}; }
    @media screen and (max-width: 600px) {
      .container-600 { width: 100% !important; max-width: 100% !important; }
      .mobile-pad-hero { padding: 28px 20px !important; }
      .mobile-pad-card { padding: 20px 16px !important; }
      .stack { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-right { display: block !important; width: 100% !important; text-align: left !important; padding-top: 14px !important; }
      .hero-h1 { font-size: 22px !important; line-height: 28px !important; }
      .amount-xl { font-size: 28px !important; line-height: 32px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgGray};">
  <div style="display:none;white-space:nowrap;font:15px courier;color:#ffffff;line-height:0;width:600px!important;min-width:600px!important;max-width:600px!important;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  <div style="display:none;font-size:1px;color:${bgGray};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheaderText || 'Important information regarding your insurance policy.'}
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${bgGray}">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <!--[if (gte mso 9)|(IE)]>
        <table cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container-600" style="width:600px; max-width:600px; background-color: ${cardBg}; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- TOP ACCENT BAR -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, ${primaryBlue} 0%, ${secondaryBlue} 50%, ${green} 100%); line-height: 6px; font-size: 0;">&nbsp;</td>
          </tr>

          ${headerSection}
          ${heroSection}
          ${paymentSection}

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 32px 40px; color: ${textDark}; font-size: 16px; line-height: 1.6; font-family: ${fontStack};">
              <div style="font-family: ${fontStack};">
                ${aiContent}
              </div>
            </td>
          </tr>

          <!-- PRIMARY CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 48px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, ${green} 0%, #059669 100%); background-color: ${green}; border: 2px solid #C8A84E;">
                    <a href="tel:${agencyPhone}" style="padding: 18px 48px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block; font-family: ${fontStack};">
                      Call Our Elkin Office
                    </a>
                  </td>
                </tr>
              </table>
              ${messengerLink}
            </td>
          </tr>

          <!-- MASTER FOOTER -->
          <tr>
            <td bgcolor="#fafafa" style="padding: 32px 24px 28px 24px; text-align: center; background-color: #fafafa; border-top: 1px solid #e2e8f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 22px auto;">
                <tr><td height="3" width="70" bgcolor="#C8A84E" style="height:3px;width:70px;background-color:#C8A84E;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 18px;">
                    <img src="https://i.imgur.com/lxu9nfT.png" alt="Bill Layne Insurance Agency" width="120" height="40" style="display:block;width:120px;height:40px;" />
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:${textDark};font-family:${fontStack};">Bill Layne Insurance Agency</p>
              <p style="margin:0 0 4px 0;font-size:13px;color:${textMuted};font-family:${fontStack};">1283 N Bridge St &bull; Elkin, NC 28621</p>
              <p style="margin:0 0 4px 0;font-size:13px;color:${textMuted};font-family:${fontStack};">
                <a href="tel:336-835-1993" style="color:${primaryBlue};text-decoration:none;font-weight:700;">(336) 835-1993</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:Save@BillLayneInsurance.com" style="color:${primaryBlue};text-decoration:none;font-weight:700;">Save@BillLayneInsurance.com</a>
              </p>
              <p style="margin:0 0 18px 0;font-size:12px;color:${textMuted};font-family:${fontStack};">
                <a href="https://www.BillLayneInsurance.com" style="color:${primaryBlue};text-decoration:none;font-weight:700;">www.BillLayneInsurance.com</a>
                &nbsp;&bull;&nbsp; Est. 2005
              </p>
              <p style="margin:0 0 14px 0;font-size:12px;color:${textMuted};font-family:${fontStack};">
                <a href="https://www.facebook.com/dollarbillagency" style="color:${primaryBlue};text-decoration:none;font-weight:700;">Facebook</a>
                &nbsp;|&nbsp;
                <a href="https://www.youtube.com/@ncautoandhome" style="color:${primaryBlue};text-decoration:none;font-weight:700;">YouTube</a>
                &nbsp;|&nbsp;
                <a href="https://www.instagram.com/ncautoandhome" style="color:${primaryBlue};text-decoration:none;font-weight:700;">Instagram</a>
                &nbsp;|&nbsp;
                <a href="https://x.com/shopsavecompare" style="color:${primaryBlue};text-decoration:none;font-weight:700;">X</a>
              </p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px auto;">
                <tr>
                  <td bgcolor="#ffffff" style="background-color:#ffffff;padding:8px 14px;border-radius:20px;border:1px solid #e2e8f0;">
                    <span style="font-size:11px;color:${textMuted};font-family:${fontStack};font-weight:600;">&#11088; 4.9 Stars on Google &bull; 100+ Reviews</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px 0;font-size:11px;color:${textMuted};font-family:${fontStack};">
                Follow us on <a href="https://www.facebook.com/dollarbillagency" style="color:${primaryBlue};text-decoration:none;font-weight:700;">Facebook</a> for insurance tips and local updates.
              </p>
              <p style="margin:0 0 14px 0;font-size:11px;color:${textMuted};font-family:${fontStack};">
                Prefer to chat? Reach us on <a href="https://m.me/dollarbillagency" style="color:${primaryBlue};text-decoration:none;font-weight:700;">Facebook Messenger</a>.
              </p>
              <p style="margin:0;font-size:10px;color:#94a3b8;line-height:1.6;font-family:${fontStack};">
                You're receiving this because you have an active policy or requested a quote from Bill Layne Insurance Agency.<br>
                To stop receiving these emails, reply with &quot;unsubscribe&quot; or call (336) 835-1993.
              </p>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Fix Cloudflare email obfuscation
  finalHtml = finalHtml.replace(/href="\/cdn-cgi\/l\/email-protection[^"]*"/g, 'href="mailto:Save@BillLayneInsurance.com"');
  
  return finalHtml;
};

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
  const msoBlocks = html.match(/<!--\[if[\s\S]*?<!\[endif\]-->/gi) || [];
  return [...msoBlocks, ...styleBlocks].join('\n');
}

function extractClipboardHtml(html: string): string {
  const headStyles = extractHeadStyles(html);
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
  if (options.bcc) params.set('bcc', options.bcc);
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
  const cleaned = (subject || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/gi, '');
  return cleaned.length ? cleaned : fallback;
}

export function downloadAsHtmlFile(html: string, subject: string): void {
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
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

export function validateGmailHtml(html: string): ValidationResult {
  const issues: ValidationWarning[] = [];

  if (!html || !html.trim()) {
    issues.push({ severity: 'error', rule: 'empty', message: 'HTML body is empty.' });
    return finalizeValidation(issues);
  }

  if (/border-radius\s*:\s*50%/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-circle-avatars',
      message: 'border-radius: 50% detected. Circle avatar patterns are deprecated.',
    });
  }

  if (/XacnUW4/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-agent-chip-image',
      message: 'Deprecated agent headshot block detected. The footer should not include the old Bill Layne photo chip.',
    });
  }

  if (/Licensed Insurance Agent/i.test(html) || /Owner\s*&amp;\s*Licensed Agent/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-agent-chip-text',
      message: 'Deprecated licensed-agent signature text detected. Warmth should live in the body copy, not a footer chip.',
    });
  }

  if (/cdn-cgi/i.test(html) || /__cf_email__/i.test(html) || /email-protection/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-cloudflare-obfuscation',
      message: 'Cloudflare email obfuscation detected in the HTML output.',
    });
  }

  const byteLength = new Blob([html]).size;
  if (byteLength > GMAIL_CLIP_THRESHOLD_BYTES) {
    issues.push({
      severity: 'error',
      rule: 'gmail-clip',
      message: `HTML is ${byteLength.toLocaleString()} bytes, which exceeds Gmail's clip threshold.`,
    });
  }

  if (!/Save@BillLayneInsurance\.com/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'missing-save-address',
      message: 'Save@BillLayneInsurance.com was not found in the generated email.',
    });
  }

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
      message: '600px spacer div not detected.',
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
      message: 'display:flex found. Gmail-safe layouts should use tables.',
    });
  }

  if (/display\s*:\s*grid/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'no-grid',
      message: 'display:grid found. Gmail-safe layouts should use tables.',
    });
  }

  if (/box-shadow\s*:/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'no-box-shadow',
      message: 'box-shadow found. Gmail often strips these styles.',
    });
  }

  if (/#003366/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'old-brand-navy',
      message: 'Deprecated navy #003366 detected. Current standard is #003f87.',
    });
  }

  if (/#FFC300/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'old-brand-gold',
      message: 'Deprecated gold #FFC300 detected. Current standard is #C8A84E.',
    });
  }

  if (!/@media\s+(screen\s+and\s+)?\(max-width:\s*600px\)/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'mobile-media-query',
      message: 'No @media (max-width: 600px) block detected. Mobile layout may not stack correctly.',
    });
  }

  if (!/application\/ld\+json/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'json-ld',
      message: 'Schema.org JSON-LD not found. Gemini inbox summaries may be weaker.',
    });
  }

  if (!/x-apple-disable-message-reformatting/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'ios-reformatting',
      message: 'Missing x-apple-disable-message-reformatting meta tag.',
    });
  }

  if (!/role="presentation"/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'presentation-tables',
      message: 'No role=\"presentation\" tables detected. Layout tables should include accessibility roles.',
    });
  }

  if (!/class="[^"]*\bstack\b/i.test(html) && /<td[^>]*align="right"/i.test(html)) {
    issues.push({
      severity: 'warning',
      rule: 'stack-class',
      message: 'Right-aligned table cells were found without a .stack class. Two-column rows may fail to restack on mobile.',
    });
  }

  return finalizeValidation(issues);
}

function finalizeValidation(issues: ValidationWarning[]): ValidationResult {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  return {
    passed: errorCount === 0,
    errorCount,
    warningCount,
    issues,
  };
}

export async function handOffToGmail(email: GeneratedEmail): Promise<{
  copied: boolean;
  opened: boolean;
  validation: ValidationResult;
}> {
  const validation = validateGmailHtml(email.htmlBody);
  const copied = await copyHtmlToClipboardAsRichText(email.htmlBody);

  let opened = false;
  if (copied) {
    const url = buildGmailComposeUrl({
      to: email.to,
      subject: email.subject,
    });
    const win = window.open(url, '_blank');
    opened = Boolean(win);
  }

  return { copied, opened, validation };
}
