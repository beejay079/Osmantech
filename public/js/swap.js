// public/js/swap.js
let PHOTO_UPLOADER = null;

document.addEventListener('DOMContentLoaded', () => {
  PHOTO_UPLOADER = OS.imageUploader(document.getElementById('photo-uploader-host'), {
    max: 5,
    uploadFn: OS.uploadMultiplePublic
  });

  const brandSelect       = document.getElementById('brand');
  const modelInput        = document.getElementById('model');
  const iphoneStorageBlk  = document.getElementById('iphone-storage-block');
  const androidSpecsBlk   = document.getElementById('android-specs-block');
  const iphone14Block     = document.getElementById('iphone-14-block');

  const storageInput      = document.getElementById('storage');
  const ramInput          = document.getElementById('ram');
  const romInput          = document.getElementById('rom');

  function updateFormFields () {
    const brand = brandSelect.value;
    const isIphone = brand === 'iPhone';
    const isAndroid = brand && brand !== 'iPhone' && brand !== '';

    iphoneStorageBlk.style.display = isIphone ? 'block' : 'none';
    storageInput.required = isIphone;

    androidSpecsBlk.style.display = isAndroid ? 'block' : 'none';
    ramInput.required = isAndroid;
    romInput.required = isAndroid;

    checkIphone14();
  }

  function checkIphone14 () {
    const v = modelInput.value.toLowerCase();
    const match = v.match(/iphone\s*(\d{2})/);
    const num = match ? parseInt(match[1], 10) : 0;
    const show = brandSelect.value === 'iPhone' && num >= 14;
    iphone14Block.style.display = show ? 'block' : 'none';
  }

  brandSelect.addEventListener('change', updateFormFields);
  modelInput.addEventListener('input', checkIphone14);

  document.getElementById('trade-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const photoUrls = PHOTO_UPLOADER.getUrls();
    const photoNote = photoUrls.length
      ? `${photoUrls.length} photo${photoUrls.length === 1 ? '' : 's'} uploaded`
      : 'Will send via WhatsApp';

    const brand = brandSelect.value;
    const isIphone = brand === 'iPhone';

    const form = {
      intent: 'swap',
      brand,
      model:         modelInput.value.trim(),
      storage:       isIphone ? storageInput.value : null,
      ram:           !isIphone ? ramInput.value : null,
      rom:           !isIphone ? romInput.value : null,
      batteryHealth: isIphone
        ? document.getElementById('batteryHealth').value
        : document.getElementById('androidBattery').value,
      receipt:       document.getElementById('receipt').value,
      condition:     document.getElementById('condition').value,
      repairHistory: document.getElementById('repairHistory').value.trim() || 'None',
      photoNote,
      photoUrls,
      simType:       isIphone ? document.getElementById('simType').value : '',
      modelType:     isIphone ? document.getElementById('modelType').value : '',
      swapToModel:   document.getElementById('swapToModel').value.trim(),
      swapToStorage: document.getElementById('swapToStorage').value,
      swapToSpecs:   document.getElementById('swapToSpecs').value.trim(),
      name:          document.getElementById('name').value.trim(),
      notes:         document.getElementById('notes').value.trim()
    };

    OS.toast('Opening WhatsApp…', 'success', 'Redirecting');
    setTimeout(() => OS.whatsapp.sellOrSwap(form), 400);
  });
});
