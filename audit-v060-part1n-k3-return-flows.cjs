const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

function status(
  label,
  ok
) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'App.tsx'
    )
  );

const purchases =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'PurchasesBlock.tsx'
    )
  );

const returnPanel =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'ReturnToManagerPanel.tsx'
    )
  );

const invoicePanel =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'InvoiceRequestTaskPanel.tsx'
    )
  );


function legacyInvoiceButtonsInactive() {

  let searchFrom = 0;


  while (true) {

    const labelIndex =
      app.indexOf(
        'Отказать / вернуть',
        searchFrom
      );


    if (labelIndex < 0) {
      return true;
    }


    const buttonStart =
      app.lastIndexOf(
        '<button',
        labelIndex
      );


    const buttonEnd =
      app.indexOf(
        '>',
        buttonStart
      );


    const close =
      app.indexOf(
        '</button>',
        labelIndex
      );


    if (
      buttonStart >= 0 &&
      buttonEnd >= 0 &&
      close >= 0
    ) {

      const opening =
        app.slice(
          buttonStart,
          buttonEnd + 1
        );


      const whole =
        app.slice(
          buttonStart,
          close +
            '</button>'.length
        );


      if (
        whole.includes(
          'setReturnModalOpen'
        ) &&
        !/\bhidden\b/.test(
          opening
        )
      ) {
        return false;
      }
    }


    searchFrom =
      labelIndex + 1;
  }
}


const common =
  Boolean(
    returnPanel
  );


const invoiceCommon =
  app.includes(
    'mode="invoice"'
  );


const oldButtonsInactive =
  legacyInvoiceButtonsInactive();


const oldModalInactive =
  !app.includes(
    'invoiceReturnModal'
  ) ||
  app.includes(
    'false &&\n        returnModalOpen'
  );


const supplierCommon =
  purchases.includes(
    'PART_1N_K2_V3_SUPPLIER_RETURN'
  ) ||
  purchases.includes(
    'PART_1N_K2_SUPPLIER_RETURN'
  );


const supplierPanel =
  supplierCommon &&
  purchases.includes(
    '<ReturnToManagerPanel'
  );


const cancelModalPreserved =
  purchases.includes(
    'cancelConfirmOpen'
  ) &&
  purchases.includes(
    'Отменить запрос оплаты?'
  );


console.log('');
console.log(
  'MSM Part 1N-K3 — аудит возвратов'
);
console.log(
  '================================'
);
console.log('');


status(
  'Общий ReturnToManagerPanel',
  common
);

status(
  'Счёт: новый общий возврат',
  invoiceCommon
);

status(
  'Счёт: старые кнопки неактивны',
  oldButtonsInactive
);

status(
  'Счёт: старое окно неактивно',
  oldModalInactive
);

status(
  'Счёт: manager repair task',
  invoicePanel.includes(
    'InvoiceRequestManagerRepair'
  )
);

status(
  'Доверенность присутствует',
  app.includes(
    'POWER_OF_ATTORNEY'
  )
);

status(
  'ЭТРН присутствует',
  app.includes(
    'ETRN'
  )
);

status(
  'Оплата поставщику: общий возврат',
  supplierPanel
);

status(
  'Окно отмены закупки сохранено',
  cancelModalPreserved
);


console.log('');
console.log(
  'ИТОГ'
);
console.log(
  '====='
);


const all =
  common &&
  invoiceCommon &&
  oldButtonsInactive &&
  oldModalInactive &&
  invoicePanel.includes(
    'InvoiceRequestManagerRepair'
  ) &&
  supplierPanel &&
  cancelModalPreserved;


console.log(
  all
    ? 'OK — активные возвраты унифицированы.'
    : 'WARN — смотрите строки выше.'
);


console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
