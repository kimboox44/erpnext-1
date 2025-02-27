// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Gestion Commandes"] = {
	"formatter": function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		var ovalue = value;
		
		 if(data != null && data != undefined){
		 	if(data["regle"] == "Livraison Par Date" ){
			value = "<div style='color: #FF7200;padding: 1px;'>" + ovalue + "</div>";
			}
		 	if(data["regle"] == "Enlèvement Client Présent" ){
			value = "<div style='color: #1A98E6;padding: 1px;'>" + ovalue + "</div>";
			}
			if(data["regle"] == "Enlèvement Par Date" ){
			value = "<div style='color: #00AD0D;padding: 1px;'>" + ovalue + "</div>";
			}
			if(data["type"] == "Reliquat" ){
			value = "<div style='color: #FC412F;padding: 1px;'>" + ovalue + "</div>";
			}
		 }
		
		
		 
		return value
	},
	"filters": [
		{
			"fieldname": "customer",
			"label": "Client",
			fieldtype: "Link",
			options: "Customer",
			"get_query":  function() {
				return {
					query: "erpnext.selling.page.point_of_sale.point_of_sale.get_active_customers"
				}
			}
		},
		{
			"fieldname": "user",
			"label": "Commercial",
			fieldtype: "Link",
			options: "User"
		},
		{
			"fieldname": "regle",
			"label": "Regle de livraison",
			fieldtype: "Link",
			options: "Shipping Rule"
		},
		{
			"fieldname": "territory",
			"label": "Region",
			fieldtype: "Link",
			options: "Territory"
		},
		{
			"fieldname": "cmd",
			"label": "Commande",
			fieldtype: "Link",
			options: "Sales Order",
			"get_query":  function() {
				return {
					query: "erpnext.selling.page.point_of_sale.point_of_sale.get_active_so"
				}
			}
		},
		{
			"fieldname": "disp",
			"label": "Disponible",
			"fieldtype": "Check",
			"default": 1
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
		},
	],
	onload: function(report) {
		var me = this;
		frappe.dom.freeze();
		report.page.add_inner_button("Generer Livraison", function() {
			var data = report.data;
			filters = report.get_values()
			items = [];
			customer = filters.customer
			if (customer == null){
				alert("Client invalide");
				return;
			}
			console.log("customer",filters)
			data.forEach( (item) => {
				var item_code = item['item'];
				if(item_code && item_code!="Total" && item_code!="_"){
					items.push(item);					 
				}
				
			});
			//console.log(items);
			frappe.call({
				method: "erpnext.selling.page.point_of_sale.point_of_sale.get_delivery",
				freeze: true,
				args: {
					items: items,
					customer: customer
				},
				callback: function(r) {
					if (r.message) {
						 window.open('/desk#Form/Delivery%20Note/'+r.message, '_blank');
						 window.open('/printview?doctype=Delivery%20Note&name='+r.message+'&format=Adresses%20Magasin&no_letterhead=0&_lang=fr', '_blank');

						window.location.reload(true); 

					}
				}
			});
			//console.log(report);
			
		});
		frappe.dom.unfreeze();
	}
}
