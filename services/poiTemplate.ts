export interface PoiData {
  INSURED_NAME: string;
  FIRST_NAME: string;
  POLICY_NUMBER: string;
  EFFECTIVE_DATE_LONG: string;
  EXPIRY_DATE_LONG: string;
  EFFECTIVE_SHORT: string;
  EXPIRY_SHORT: string;
  YEAR: string;
  CARRIER: string;
  CARRIER_LOGO_URL: string;
  ISSUING_COMPANY_NAME: string;
  CARRIER_BADGE_TEXT: string;
  VEHICLE_YEAR: string;
  VEHICLE_MAKE: string;
  VEHICLE_MODEL: string;
  VIN: string;
  COVERAGES: { name: string; limit: string }[];
}

const escapeHtml = (value?: string) =>
  (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildCoverageRows = (coverages: PoiData['COVERAGES'], fontStack: string) =>
  coverages
    .map(
      (cov) => `
        <tr>
          <td class="stack nowrap-guard" width="60%" valign="top" style="width:60%; padding:14px 0; border-bottom:1px solid #e2e8f0; font-family:${fontStack}; font-size:14px; line-height:20px; color:#0f172a; font-weight:600; word-break:break-word; overflow-wrap:break-word; mso-line-height-rule:exactly;">
            ${escapeHtml(cov.name)}
          </td>
          <td class="stack stack-right nowrap-guard" width="40%" valign="top" align="right" style="width:40%; padding:14px 0; border-bottom:1px solid #e2e8f0; text-align:right; font-family:${fontStack}; font-size:14px; line-height:20px; color:#003f87; font-weight:700; word-break:break-word; overflow-wrap:break-word; mso-line-height-rule:exactly;">
            ${escapeHtml(cov.limit)}
          </td>
        </tr>
      `,
    )
    .join('');

export const generatePoiEmail = (data: PoiData): string => {
  const fontStack = "'Inter', Arial, 'Helvetica Neue', Helvetica, sans-serif";
  const carrierLogoRaw = data.CARRIER_LOGO_URL?.trim() || '';
  const hasCarrierLogo = carrierLogoRaw.length > 0;
  const insuredName = escapeHtml(data.INSURED_NAME);
  const firstName = escapeHtml(data.FIRST_NAME);
  const policyNumber = escapeHtml(data.POLICY_NUMBER);
  const effectiveShort = escapeHtml(data.EFFECTIVE_SHORT);
  const expiryShort = escapeHtml(data.EXPIRY_SHORT);
  const effectiveLong = escapeHtml(data.EFFECTIVE_DATE_LONG);
  const expiryLong = escapeHtml(data.EXPIRY_DATE_LONG);
  const vehicle = escapeHtml(
    `${data.VEHICLE_YEAR} ${data.VEHICLE_MAKE} ${data.VEHICLE_MODEL}`.trim(),
  );
  const vin = escapeHtml(data.VIN);
  const carrier = escapeHtml(data.CARRIER || data.ISSUING_COMPANY_NAME || 'Your Carrier');
  const carrierBadge = escapeHtml(data.CARRIER_BADGE_TEXT || 'Proof Available');
  const policyYear = escapeHtml(data.YEAR || String(new Date().getFullYear()));
  const coveragesHtml = buildCoverageRows(data.COVERAGES || [], fontStack);

  const jsonLd = {
    '@context': 'http://schema.org',
    '@type': 'EmailMessage',
    description: 'Proof of Insurance / ID Card',
    potentialAction: {
      '@type': 'ViewAction',
      target: 'https://www.billlayneinsurance.com',
      name: 'View Policy Details',
    },
  };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if gte mso 9]>
  <xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    body { margin:0 !important; padding:0 !important; width:100% !important; background-color:#f8fafc; font-family:${fontStack}; }
    p, h1, h2, h3 { margin:0; mso-line-height-rule:exactly; }

    @media screen and (max-width: 600px) {
      .container-600 { width:100% !important; max-width:100% !important; }
      .mobile-pad-20 { padding-left:16px !important; padding-right:16px !important; }
      .mobile-pad-card { padding:20px !important; }
      .mobile-pad-hero { padding:32px 16px !important; }
      .stack { display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; }
      .stack-right { text-align:left !important; padding-top:14px !important; }
      .hero-h1 { font-size:22px !important; line-height:28px !important; }
      .logo-mobile img { width:150px !important; height:auto !important; }
      .nowrap-guard { word-break:break-word !important; overflow-wrap:break-word !important; }
      .mobile-center { text-align:center !important; }
      .mobile-divider { display:none !important; }
    }
  </style>
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
  </script>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f8fafc;">
    Your proof of insurance for ${vehicle} is ready to keep on your phone or in your vehicle.
  </div>
  <div style="display:none; white-space:nowrap; font:15px courier; color:#f8fafc; line-height:0; width:600px !important; min-width:600px !important; max-width:600px !important;">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; background-color:#f8fafc;">
    <tr>
      <td align="center" valign="top" style="padding:20px 10px;">
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container-600" style="width:600px; max-width:600px; margin:0 auto;">
          <tr>
            <td style="height:4px; line-height:4px; font-size:1px; background:linear-gradient(90deg,#003f87,#C8A84E); background-color:#003f87;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff; padding:0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
                <tr>
                  <td class="stack logo-mobile mobile-center" width="50%" valign="middle" align="center" bgcolor="#ffffff" style="width:50%; padding:22px 12px; background-color:#ffffff;">
                    <img src="https://i.imgur.com/lxu9nfT.png" alt="Bill Layne Insurance Agency" width="170" style="display:block; width:170px; max-width:100%; height:auto; margin:0 auto;" />
                    <p style="margin:8px 0 0 0; font-family:${fontStack}; font-size:10px; line-height:14px; color:#64748b; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">Your Independent Agency</p>
                  </td>
                  <td class="mobile-divider" width="1" style="width:1px; background-color:#e2e8f0;">&nbsp;</td>
                  <td class="stack logo-mobile mobile-center" width="50%" valign="middle" align="center" bgcolor="#ffffff" style="width:50%; padding:22px 12px; background-color:#ffffff;">
                    ${
                      hasCarrierLogo
                        ? `<img src="${carrierLogoRaw}" alt="${carrier}" width="150" style="display:block; width:150px; max-width:100%; height:auto; margin:0 auto;" />`
                        : `<p style="margin:0; padding:10px 14px; display:inline-block; font-family:${fontStack}; font-size:13px; line-height:18px; color:#003f87; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; border:1px solid #e2e8f0; border-radius:8px; background-color:#ffffff;">${carrier}</p>`
                    }
                    <p style="margin:8px 0 0 0; font-family:${fontStack}; font-size:10px; line-height:14px; color:#64748b; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">Your Quoted Carrier &middot; ${carrierBadge}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad-hero" bgcolor="#0f172a" style="background:linear-gradient(135deg,#0f172a 0%,#1a365d 55%,#0f766e 100%); background-color:#0f172a; padding:36px 32px;">
              <p style="margin:0 0 8px 0; font-family:${fontStack}; font-size:12px; line-height:16px; color:#C8A84E; font-weight:700; letter-spacing:1.1px; text-transform:uppercase;">&#128663; Proof of Insurance Ready</p>
              <h1 class="hero-h1" style="margin:0 0 10px 0; font-family:${fontStack}; font-size:26px; line-height:32px; color:#ffffff; font-weight:700;">Your ID card and policy proof are attached</h1>
              <p class="nowrap-guard" style="margin:0; font-family:${fontStack}; font-size:14px; line-height:22px; color:#dbeafe; word-break:break-word; overflow-wrap:break-word; mso-line-height-rule:exactly;">
                Hi ${firstName}, here is your active proof of insurance for <strong>${vehicle}</strong>. Keep it handy on your phone and in the vehicle for quick access.
              </p>
            </td>
          </tr>

          <tr>
            <td bgcolor="#fafafa" class="mobile-pad-20" style="background-color:#fafafa; padding:24px 32px 0 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:6px;">
                <tr>
                  <td class="mobile-pad-card" style="padding:22px;">
                    <p style="margin:0 0 14px 0; font-family:${fontStack}; font-size:11px; line-height:14px; color:#64748b; font-weight:700; letter-spacing:1px; text-transform:uppercase;">Policy Details</p>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
                      <tr>
                        <td class="stack nowrap-guard" width="60%" valign="top" style="width:60%; padding-bottom:18px; word-break:break-word; overflow-wrap:break-word;">
                          <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:12px; line-height:16px; color:#64748b; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">Insured</p>
                          <p style="margin:0; font-family:${fontStack}; font-size:18px; line-height:24px; color:#0f172a; font-weight:700;">${insuredName}</p>
                        </td>
                        <td class="stack stack-right nowrap-guard" width="40%" valign="top" align="right" style="width:40%; padding-bottom:18px; text-align:right; word-break:break-word; overflow-wrap:break-word;">
                          <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:12px; line-height:16px; color:#64748b; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">Policy Number</p>
                          <p style="margin:0; font-family:${fontStack}; font-size:18px; line-height:24px; color:#003f87; font-weight:700;">${policyNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td class="stack" width="50%" valign="top" style="width:50%;">
                          <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:12px; line-height:16px; color:#64748b; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">Effective Date</p>
                          <p style="margin:0; font-family:${fontStack}; font-size:15px; line-height:20px; color:#0f172a; font-weight:600;">${effectiveShort}</p>
                          <p style="margin:4px 0 0 0; font-family:${fontStack}; font-size:12px; line-height:17px; color:#94a3b8;">${effectiveLong}</p>
                        </td>
                        <td class="stack stack-right" width="50%" valign="top" align="right" style="width:50%; text-align:right;">
                          <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:12px; line-height:16px; color:#64748b; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">Expiration Date</p>
                          <p style="margin:0; font-family:${fontStack}; font-size:15px; line-height:20px; color:#0f172a; font-weight:600;">${expiryShort}</p>
                          <p style="margin:4px 0 0 0; font-family:${fontStack}; font-size:12px; line-height:17px; color:#94a3b8;">${expiryLong}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#fafafa" class="mobile-pad-20" style="background-color:#fafafa; padding:24px 32px 0 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:6px;">
                <tr>
                  <td class="mobile-pad-card" style="padding:22px;">
                    <p style="margin:0 0 14px 0; font-family:${fontStack}; font-size:11px; line-height:14px; color:#64748b; font-weight:700; letter-spacing:1px; text-transform:uppercase;">Vehicle on File</p>
                    <p class="nowrap-guard" style="margin:0 0 6px 0; font-family:${fontStack}; font-size:18px; line-height:24px; color:#0f172a; font-weight:700; word-break:break-word; overflow-wrap:break-word;">${vehicle}</p>
                    <p class="nowrap-guard" style="margin:0; font-family:${fontStack}; font-size:13px; line-height:19px; color:#64748b; word-break:break-word; overflow-wrap:break-word;">VIN &middot; ${vin}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            data.COVERAGES && data.COVERAGES.length > 0
              ? `
          <tr>
            <td bgcolor="#fafafa" class="mobile-pad-20" style="background-color:#fafafa; padding:24px 32px 0 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:6px;">
                <tr>
                  <td class="mobile-pad-card" style="padding:22px;">
                    <p style="margin:0 0 14px 0; font-family:${fontStack}; font-size:11px; line-height:14px; color:#64748b; font-weight:700; letter-spacing:1px; text-transform:uppercase;">&#128737;&#65039; Coverage Summary</p>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
                      ${coveragesHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
              `
              : ''
          }

          <tr>
            <td bgcolor="#fafafa" class="mobile-pad-20" style="background-color:#fafafa; padding:24px 32px 28px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:6px;">
                <tr>
                  <td class="mobile-pad-card" style="padding:22px;">
                    <p style="margin:0 0 10px 0; font-family:${fontStack}; font-size:11px; line-height:14px; color:#0369a1; font-weight:700; letter-spacing:1px; text-transform:uppercase;">Quick Reminder</p>
                    <p style="margin:0; font-family:${fontStack}; font-size:14px; line-height:22px; color:#0f172a;">
                      Save this email, keep the attached ID card in the vehicle, and reach out if you need another copy for DMV, a lender, or a replacement vehicle.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#fafafa" class="mobile-pad-20" align="center" style="background-color:#fafafa; padding:0 32px 32px 32px; text-align:center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center" bgcolor="#C8A84E" style="background-color:#C8A84E; border-radius:6px;">
                    <a href="tel:336-835-1993" style="display:inline-block; padding:14px 30px; font-family:${fontStack}; font-size:15px; line-height:18px; color:#0f172a; font-weight:700; text-decoration:none;">
                      Call Our Elkin Office
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0; font-family:${fontStack}; font-size:12px; line-height:18px; color:#64748b;">
                Need another copy? Email <a href="mailto:Save@BillLayneInsurance.com" style="color:#003f87; text-decoration:none; font-weight:700;">Save@BillLayneInsurance.com</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="height:4px; line-height:4px; font-size:1px; background:linear-gradient(90deg,#003f87,#C8A84E); background-color:#C8A84E;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" class="mobile-pad-20" align="center" style="background-color:#ffffff; padding:32px 32px 28px 32px; text-align:center;">
              <img src="https://i.imgur.com/lxu9nfT.png" alt="Bill Layne Insurance Agency" width="180" style="display:block; width:180px; max-width:100%; height:auto; margin:0 auto 16px auto;" />
              <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:14px; line-height:20px; color:#0f172a; font-weight:700;">Bill Layne Insurance Agency</p>
              <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:13px; line-height:18px; color:#64748b;">1283 N Bridge St, Elkin, NC 28621</p>
              <p style="margin:0 0 4px 0; font-family:${fontStack}; font-size:13px; line-height:18px; color:#64748b;">
                <a href="tel:336-835-1993" style="color:#003f87; text-decoration:none;">(336) 835-1993</a> &nbsp;&middot;&nbsp;
                <a href="mailto:Save@BillLayneInsurance.com" style="color:#003f87; text-decoration:none;">Save@BillLayneInsurance.com</a>
              </p>
              <p style="margin:0 0 14px 0; font-family:${fontStack}; font-size:13px; line-height:18px; color:#64748b;">
                <a href="https://BillLayneInsurance.com" style="color:#003f87; text-decoration:none;">BillLayneInsurance.com</a> &nbsp;&middot;&nbsp; Est. 2005
              </p>
              <p style="margin:0 0 12px 0; font-family:${fontStack}; font-size:12px; line-height:18px; color:#64748b;">
                <a href="https://facebook.com/dollarbillagency" style="color:#64748b; text-decoration:none;">Facebook</a> &nbsp;|&nbsp;
                <a href="https://www.youtube.com/@ncautoandhome" style="color:#64748b; text-decoration:none;">YouTube</a> &nbsp;|&nbsp;
                <a href="https://www.instagram.com/ncautoandhome" style="color:#64748b; text-decoration:none;">Instagram</a> &nbsp;|&nbsp;
                <a href="https://x.com/shopsavecompare" style="color:#64748b; text-decoration:none;">X</a>
              </p>
              <p style="margin:0 0 10px 0; font-family:${fontStack}; font-size:13px; line-height:18px; color:#0f172a; font-weight:700;">
                <span style="color:#C8A84E;">&#9733;&#9733;&#9733;&#9733;&#9733;</span> &nbsp;4.9 on Google Reviews
              </p>
              <p style="margin:0 0 8px 0; font-family:${fontStack}; font-size:12px; line-height:18px; color:#64748b;">
                Follow us on <a href="https://facebook.com/dollarbillagency" style="color:#003f87; text-decoration:none; font-weight:600;">Facebook</a> for local updates &amp; tips
              </p>
              <p style="margin:0 0 18px 0; font-family:${fontStack}; font-size:12px; line-height:18px; color:#64748b;">
                Need help? <a href="https://m.me/dollarbillagency" style="color:#003f87; text-decoration:none; font-weight:600;">Message us on Messenger</a>
              </p>
              <p style="margin:0; font-family:${fontStack}; font-size:11px; line-height:16px; color:#94a3b8;">
                To stop receiving these emails, reply with UNSUBSCRIBE.
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
};
