// public/js/whatsapp.js — central WhatsApp redirect helper
// All buy / sell / swap / fix / cart submissions go through these.

window.OS = window.OS || {};
OS.WHATSAPP_NUMBER = '2348132664146';

OS.whatsapp = {
  /** Build a wa.me URL with a pre-filled message */
  url (message) {
    return `https://wa.me/${OS.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  },

  /** Open WhatsApp in a new tab with the given message */
  open (message) {
    window.open(this.url(message), '_blank');
  },

  /** Format a key/value list nicely for WhatsApp.
   *  Strings (incl. empty '') pass through as-is.
   *  Arrays [label, value] become "• *label:* value" — but only if value is truthy. */
  format (lines) {
    return lines
      .filter(l => l !== null && l !== undefined && (Array.isArray(l) ? l[1] : true))
      .map(l => Array.isArray(l) ? `• *${l[0]}:* ${l[1]}` : l)
      .join('\n');
  },

  /** BUY a single product */
  buy (product, qty = 1) {
    const msg = [
      `🛍️ *NEW ORDER ENQUIRY*`,
      ``,
      `Hello OSMANTECH! I'd like to buy:`,
      ``,
      `📱 *${product.name}*`,
      `• Brand: ${product.brand || '—'}`,
      `• Price: ₦${Number(product.price).toLocaleString('en-NG')}`,
      `• Quantity: ${qty}`,
      `• Total: ₦${(product.price * qty).toLocaleString('en-NG')}`,
      product.id ? `• Product ID: #${product.id}` : '',
      ``,
      `Please send me payment & delivery details. Thanks!`
    ].filter(Boolean).join('\n');
    this.open(msg);
  },

  /** BUY multiple products from cart */
  buyCart (items) {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const lines = [
      `🛒 *CART ORDER ENQUIRY*`,
      ``,
      `Hello OSMANTECH! I'd like to order the following:`,
      ``,
      ...items.map((i, idx) =>
        `${idx + 1}. *${i.name}*\n   Qty: ${i.quantity} × ₦${i.price.toLocaleString('en-NG')} = ₦${(i.price * i.quantity).toLocaleString('en-NG')}`
      ),
      ``,
      `*TOTAL: ₦${total.toLocaleString('en-NG')}*`,
      ``,
      `Please send me payment & delivery details. Thanks!`
    ];
    this.open(lines.join('\n'));
  },

  /** SELL/SWAP — detailed phone trade-in template */
  sellOrSwap (form) {
    const isIphone = form.brand === 'iPhone';
    const lines = [
      form.intent === 'sell' ? `💰 *SELL TO OSMANTECH*` : `🔄 *SWAP REQUEST*`,
      ``,
      form.intent === 'sell'
        ? `Hello OSMANTECH! I'd like to sell my phone. Here are the details:`
        : `Hello OSMANTECH! I'd like to swap my phone. Here are the details:`,
      ``,
      `📱 *CURRENT PHONE DETAILS*`,
      ['Brand', form.brand],
      ['Model', form.model]
    ];

    // Storage details — different for iPhone vs Android
    if (isIphone) {
      lines.push(['Storage', form.storage ? form.storage + ' GB' : '']);
    } else {
      lines.push(['RAM', form.ram ? form.ram + ' GB' : '']);
      lines.push(['ROM', form.rom ? form.rom + ' GB' : '']);
    }

    lines.push(
      ['Battery Health', form.batteryHealth ? form.batteryHealth + '%' : ''],
      ['Receipt', form.receipt],
      ['Repair History', form.repairHistory],
      ['Condition', form.condition],
      ['Photo/Video', form.photoNote || 'Will send via WhatsApp']
    );

    // iPhone 14+ extras
    if (form.simType || form.modelType) {
      lines.push(``, `📌 *iPhone 14 Series & Above Specs*`);
      if (form.simType)   lines.push(['SIM Type', form.simType]);
      if (form.modelType) lines.push(['Model Type', form.modelType]);
    }

    if (form.intent === 'swap') {
      lines.push(``, `🔄 *SWAP TO*`);
      lines.push(['Phone Model', form.swapToModel]);
      if (form.swapToStorage) lines.push(['Storage', form.swapToStorage + ' GB']);
      if (form.swapToSpecs)   lines.push(['Other Specs', form.swapToSpecs]);
    } else if (form.askingPrice) {
      lines.push(``, ['Asking Price', '₦' + Number(form.askingPrice).toLocaleString('en-NG')]);
    }

    if (form.notes) lines.push(``, `📝 *Notes:* ${form.notes}`);
    if (form.name)  lines.push(``, `*Name:* ${form.name}`);

    // Include uploaded photo links so admin can preview before chat
    if (Array.isArray(form.photoUrls) && form.photoUrls.length) {
      lines.push(``, `📸 *Photos uploaded:*`);
      form.photoUrls.forEach((u, i) => {
        const abs = u.startsWith('http') ? u : `${location.origin}${u}`;
        lines.push(`${i + 1}. ${abs}`);
      });
      lines.push(``, `(I'll also attach them directly in this chat.)`);
    } else {
      lines.push(``, `I'll send photos/videos of the device shortly. Thanks!`);
    }

    this.open(this.format(lines));
  },

  /** FIX / repair booking */
  fix (form) {
    const lines = [
      `🔧 *REPAIR BOOKING*`,
      ``,
      `Hello OSMANTECH! I need to book a repair:`,
      ``,
      ['Device Type', form.deviceType],
      ['Device Model', form.deviceModel],
      ['Issue', form.issue],
      ['Service Type', form.serviceType],
      ['Preferred Date', form.preferredDate],
      ['Name', form.name],
      ['Phone', form.phone]
    ];
    if (form.notes) lines.push(``, `📝 ${form.notes}`);
    lines.push(``, `Please confirm and let me know the next steps. Thanks!`);
    this.open(this.format(lines));
  },

  /** General contact */
  contact (form) {
    const lines = [
      `💬 *MESSAGE FROM WEBSITE*`,
      ``,
      ['Name', form.name],
      ['Phone', form.phone],
      ['Email', form.email],
      form.subject ? ['Subject', form.subject] : null,
      ``,
      form.body
    ].filter(Boolean);
    this.open(this.format(lines));
  }
};
