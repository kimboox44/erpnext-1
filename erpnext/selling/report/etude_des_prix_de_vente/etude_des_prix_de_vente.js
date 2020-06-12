// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Etude des prix de vente"] = {
	"filters": [
		{
			"fieldname": "item_code",
			"label": "Code d'article",
			fieldtype: "Data"
		},
		{
			"fieldname": "ref_fabricant",
			"label": "Ref Fabricant",
			fieldtype: "Data"
		},
		{
			"fieldname": "group",
			"label": __("Item Group"),
			fieldtype: "Link",
			options: "Item Group"
		},
		{
			"fieldname": "variant_of",
			"label": "Modéle",
			fieldtype: "Link",
			options: "Item",
			"get_query": function() {
			return {
				"doctype": "Item",
				"filters": {
					"has_variants": 1,
					   }
				}
			}
		},
		{
			"fieldname": "marque_v",
			"label": __("Marque vehicule"),
			fieldtype: "Link",
			options: "Marque vehicule"
		},
		{
			"fieldname": "modele_v",
			"label": __("Modele vehicule"),
			fieldtype: "Link",
			options: "Modele de vehicule"
		},
		{
			"fieldname": "generation_v",
			"label": "Generation vehicule",
			fieldtype: "Link",
			options: "Generation vehicule"
		}, 
		{
			"fieldname": "version",
			"label": __("Version vehicule"),
			fieldtype: "Link",
			options: "Version vehicule"
		},		
		{
			"fieldname":"manufacturer",
			"label": __("Manufacturer"),
			"fieldtype": "MultiSelect",
			get_data: function() {
				var manufacturers = frappe.query_report.get_filter_value("manufacturer") || "";

				const values = manufacturers.split(/\s*,\s*/).filter(d => d);
				const txt = manufacturers.match(/[^,\s*]*$/)[0] || '';
				let data = [];

				frappe.call({
					type: "GET",
					method:'frappe.desk.search.search_link',
					async: false,
					no_spinner: true,
					args: {
						doctype: "Manufacturer",
						txt: txt,
						filters: {
							"name": ["not in", values]
						}
					},
					callback: function(r) {
						data = r.results;
					}
				});
				return data;
			}
		},
		{
			"fieldname":"age_plus",
			"label": __("Age plus que"),
			"fieldtype": "Select",
			"options": ["","1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
			"default": ""
		},
		{
			"fieldname":"age_minus",
			"label": __("Age moin que"),
			"fieldtype": "Select",
			"options": ["","1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
			"default": ""
		},
		{
			"fieldname": "price_list",
			"label": "Liste de prix",
			fieldtype: "Link",
			options: "Price List"
		},
		{
			"fieldname":"manufacturer_lp",
			"label": "Fabricant LP",
			"fieldtype": "MultiSelect",
			get_data: function() {
				var manufacturers = frappe.query_report.get_filter_value("manufacturer_lp") || "";

				const values = manufacturers.split(/\s*,\s*/).filter(d => d);
				const txt = manufacturers.match(/[^,\s*]*$/)[0] || '';
				let data = [];

				frappe.call({
					type: "GET",
					method:'frappe.desk.search.search_link',
					async: false,
					no_spinner: true,
					args: {
						doctype: "Manufacturer",
						txt: txt,
						filters: {
							"name": ["not in", values]
						}
					},
					callback: function(r) {
						data = r.results;
					}
				});
				return data;
			} 
		},
		{
			"fieldname":"from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_days(frappe.datetime.get_today(), -240),
			"width": "80"
		},
		{
		"fieldname": "receipt",
		"label": "Recu d'achat",
		fieldtype: "Link",
		options: "Purchase Receipt", 
			"get_query": function() {
				return {
					"doctype": "Purchase Receipt",
					"filters": {
						"docstatus": "1",
					}
				}
			}
		}
	]
}
