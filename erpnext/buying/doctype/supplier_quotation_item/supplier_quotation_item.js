// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Supplier Quotation Item', {
	before_save: function(frm) {
		//frm.set_value("ref_devis",frm.doc.parent);
	}
});
