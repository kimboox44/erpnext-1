// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.provide("erpnext.utils");
 

erpnext.utils.open_item_info =  function(item_code,me) {
	var me = me;
	console.log(me);
	frappe.call({
			"method": "erpnext.selling.page.point_of_sale.point_of_sale.open_item_info",
			"args": {
				"item_code": item_code
			},
			"callback": function(response) { 
				  
				
				
				//btn-print
				$(document).off("click", ".btn-print").on('click', '.btn-print', function(){
					 event.stopPropagation();  
					var url = window.location.origin + "/printview?doctype=Item&name="+item_code+"&trigger_print=1&format=Format%20Article%20Publique&no_letterhead=0&_lang=fr"
					window.open(url , '_blank', 'toolbar=0,location=0,menubar=0,location=yes, scrollbars=yes,status=yes'); 
				});
				
				//btn-analyse
				$(document).off("click", ".btn-analyse").on('click', '.btn-analyse', function(){
					 event.stopPropagation();  
					var model = $('.btn-analyse').attr("data-item-code");
					var url = window.location.origin + "/desk#query-report/Sales%20Analytics?item_model="+model
					window.open(url , '_blank'); 
				});
				$(document).off("click", ".btn-info-price").on('click', '.btn-info-price', function(){
					event.stopPropagation(); 
					
					if (!$('.etat-price').is(':empty')){
					 	$('.etat-price').empty();
						return;
					}
					
					$('.info-vehicule').remove();
					 frappe.call({
						    "method": "erpnext.selling.page.point_of_sale.point_of_sale.get_item_prices",
						    "args": {
							"item_code": item_code
						    },
						    "callback": function(response) {
							    if(response.message){
								
								$('.etat-price').html("<br><br><br><div class='info-price'> "+response.message['price']+" <div><br><br>");							 
							    }
						    }
					 });
				});
				$(document).off("click", ".btn-open").on('click', '.btn-open', function(){
					 event.stopPropagation(); 
					window.open('#Form/Item/'+item_code , '_blank', 'toolbar=0,location=0,menubar=0,location=yes, scrollbars=yes,status=yes'); 
				});
				
				//btn-val
				$(document).off("click", ".btn-etat-val").on('click', '.btn-etat-val', function(){
					event.stopPropagation(); 
					if (!$('.etat-val').is(':empty')){
					 	$('.etat-val').empty();
						return;
					}
					var html = `<br><strong>Valorisation</strong><br>`;
					frappe.call({
					    "method": "erpnext.selling.page.point_of_sale.point_of_sale.get_valorisation",
					    "args": {
						"item_code": item_code,
					    },
					    "callback": function(response) {
						var item = response.message; 
						//console.log("val :"+item);
						if (item) {

							var html  =`<br><strong>Valorisation</strong><br>`+item;
							$('.etat-val').html(html+'<br><br>');
						}
					    }
					 });
					
				});
				
				//btn-etat-stock
				$(document).off("click", ".btn-etat-stock").on('click', '.btn-etat-stock', function(){
					
					if (!$('.etat-stock').is(':empty')){
					 	$('.etat-stock').empty();
						return;
					}
					 
					 frappe.call({
					    "method": "erpnext.selling.page.point_of_sale.point_of_sale.get_stock_details",
					    "args": {
						"item_code": item_code,
					    },
					    "callback": function(response) {
						    var item = response.message; 
							if (item) {
								var orderd = item[2];
								//console.log(orderd);
								var html  =`<br><br>Qts disponible dans le réseau <br><br>`;
								if(orderd){
									html+= "<strong>Article Commandé</strong><br><br>"
								}
								$.each(item[0], function(i, d) {

									html+='<label>'+d['warehouse']+'</label>'+' :&nbsp;&nbsp;&nbsp;&nbsp;'+d['actual_qty']+'<br>';
								});
								
								$('.etat-stock').html(html+'<br><br>');
						    	}
					    }
					 });
					
				});
				
				
				$(document).off("click", ".btn-versions-list").on('click', '.btn-versions-list', function(){
					$('.info-vehicule').remove();
					$('.info-price').remove();
				//  $(me).find('.modal .btn-versions-list').on('click', () => {
					
					frappe.call({
					    "method": "erpnext.selling.page.point_of_sale.point_of_sale.get_vehicule_details",
					    "args": {
						"item_code": item_code
					    },
					    "callback": function(response) {
							var item = response.message;
							if (item) {

							    var versions = item[0];
							    var generations = item[1];
							    var modeles = item[2];
							    var marques = item[3];

							    var html = '';
							    html += `<label>Versions: </label><table class="table table-bordered table-condensed">`;
							    for (const _v in versions) {

								let v = versions[_v];

								html += `<tr>`;
								html += ` 
																<td> ${v.version_vehicule || ''}<br>${v.marque_vehicule || ''} </td>

																<td> ${v.nom_version || ''}  </td>
																<td  style="width:100px"> ${v.periode || ''}</td>
																<td> ${v.critere || ''}  ${v.valeur_1 || ''}  ${v.critere_1 || ''}  ${v.valeur_2 || ''}   ${v.critere_2 || ''}  ${v.valeur_3 || ''}   </td>
															`;
								html += `</tr>`;
							    }
							    html += `</table>`;

							    var html_generations = '';
							    html_generations += `<label>Generations: </label><table class="table table-bordered table-condensed">`;
							    for (const _v in generations) {

								let v = generations[_v];
								let d = (v.date_debut || '').substring(5, 7) + '-' + (v.date_debut || '').substring(2, 4)
								let f = (v.date_fin || '').substring(5, 7) + '-' + (v.date_fin || '').substring(2, 4)
								html_generations += `<tr>`;
								html_generations += ` 
																<td> ${v.nom_marque || ''} </td>	
																<td> ${v.nom_generation || ''} </td>
																<td style="width:100px"> (${d || ''} ${f || ''}) </td>
																<td> ${v.critere || ''}  ${v.valeur_1 || ''}   ${v.critere_1 || ''}  ${v.valeur_2 || ''}   ${v.critere_2 || ''}  ${v.valeur_3 || ''}    </td>
															`;
								html_generations += `</tr>`;
							    }
							    html_generations += `</table>`;

							    var html_modeles = '';
							    html_modeles += `<label>Modeles: </label><table class="table table-bordered table-condensed">`;
							    for (const _v in modeles) {

								let v = modeles[_v];

								html_modeles += `<tr>`;
								html_modeles += ` 
																<td> ${v.nom_modele || ''} </td>
																<td> ${v.nom_marque || ''} </td>
															`;
								html_modeles += `</tr>`;
							    }
							    html_modeles += `</table>`;

							    var html_marques = '';
							    html_marques += `<label>Marques: </label><table class="table table-bordered table-condensed">`;
							    for (const _v in marques) {

								let v = marques[_v];

								html_marques += `<tr>`;
								html_marques += ` 
																<td> ${v.marque || ''} </td>
															`;
								html_marques += `</tr>`;
							    }
							    html_marques += `</table>`;

							    frappe.msgprint(`<div class='info-vehicule'> 
															${html}
															${html_generations}
															${html_modeles}
															${html_marques}
														</div>`);

							}
						    }

						});

					    }); 
			}
	});
}
erpnext.utils.get_party_details = function(frm, method, args, callback) {
	if(!method) {
		method = "erpnext.accounts.party.get_party_details";
	}
	if(!args) {
		if((frm.doctype != "Purchase Order" && frm.doc.customer)
			|| (frm.doc.party_name && in_list(['Quotation', 'Opportunity'], frm.doc.doctype))) {

			let party_type = "Customer";
			if(frm.doc.quotation_to && frm.doc.quotation_to === "Lead") {
				party_type = "Lead";
			}

			args = {
				party: frm.doc.customer || frm.doc.party_name,
				party_type: party_type,
				price_list: frm.doc.selling_price_list
			};
		} else if(frm.doc.supplier) {
			args = {
				party: frm.doc.supplier,
				party_type: "Supplier",
				bill_date: frm.doc.bill_date,
				price_list: frm.doc.buying_price_list
			};
		}

		if (args) {
			args.posting_date = frm.doc.posting_date || frm.doc.transaction_date;
		}
	}
	if(!args || !args.party) return;

	if(frappe.meta.get_docfield(frm.doc.doctype, "taxes")) {
		if(!erpnext.utils.validate_mandatory(frm, "Posting/Transaction Date",
			args.posting_date, args.party_type=="Customer" ? "customer": "supplier")) return;
	}

	args.currency = frm.doc.currency;
	args.company = frm.doc.company;
	args.doctype = frm.doc.doctype;
	frappe.call({
		method: method,
		args: args,
		callback: function(r) {
			if(r.message) {
				frm.supplier_tds = r.message.supplier_tds;
				frm.updating_party_details = true;
				frappe.run_serially([
					() => frm.set_value(r.message),
					() => {
						frm.updating_party_details = false;
						if(callback) callback();
						frm.refresh();
						erpnext.utils.add_item(frm);
					}
				]);
			}
		}
	});
}

erpnext.utils.add_item = function(frm) {
	if(frm.is_new()) {
		var prev_route = frappe.get_prev_route();
		if(prev_route[1]==='Item' && !(frm.doc.items && frm.doc.items.length)) {
			// add row
			var item = frm.add_child('items');
			frm.refresh_field('items');

			// set item
			frappe.model.set_value(item.doctype, item.name, 'item_code', prev_route[2]);
		}
	}
}

erpnext.utils.get_address_display = function(frm, address_field, display_field, is_your_company_address) {
	if(frm.updating_party_details) return;

	if(!address_field) {
		if(frm.doctype != "Purchase Order" && frm.doc.customer) {
			address_field = "customer_address";
		} else if(frm.doc.supplier) {
			address_field = "supplier_address";
		} else return;
	}

	if(!display_field) display_field = "address_display";
	if(frm.doc[address_field]) {
		frappe.call({
			method: "frappe.contacts.doctype.address.address.get_address_display",
			args: {"address_dict": frm.doc[address_field] },
			callback: function(r) {
				if(r.message) {
					frm.set_value(display_field, r.message)
				}
				erpnext.utils.set_taxes(frm, address_field, display_field, is_your_company_address);
			}
		})
	} else {
		frm.set_value(display_field, '');
	}
};

erpnext.utils.set_taxes = function(frm, address_field, display_field, is_your_company_address) {
	if(frappe.meta.get_docfield(frm.doc.doctype, "taxes") && !is_your_company_address) {
		if(!erpnext.utils.validate_mandatory(frm, "Lead/Customer/Supplier",
			frm.doc.customer || frm.doc.supplier || frm.doc.lead || frm.doc.party_name , address_field)) {
			return;
		}

		if(!erpnext.utils.validate_mandatory(frm, "Posting/Transaction Date",
			frm.doc.posting_date || frm.doc.transaction_date, address_field)) {
			return;
		}
	} else {
		return;
	}

	var party_type, party;
	if (frm.doc.lead) {
		party_type = 'Lead';
		party = frm.doc.lead;
	} else if (frm.doc.customer) {
		party_type = 'Customer';
		party = frm.doc.customer;
	} else if (frm.doc.supplier) {
		party_type = 'Supplier';
		party = frm.doc.supplier;
	} else if (frm.doc.quotation_to){
		party_type = frm.doc.quotation_to;
		party = frm.doc.party_name;
	}

	frappe.call({
		method: "erpnext.accounts.party.set_taxes",
		args: {
			"party": party,
			"party_type": party_type,
			"posting_date": frm.doc.posting_date || frm.doc.transaction_date,
			"company": frm.doc.company,
			"billing_address": ((frm.doc.customer || frm.doc.lead) ? (frm.doc.customer_address) : (frm.doc.supplier_address)),
			"shipping_address": frm.doc.shipping_address_name
		},
		callback: function(r) {
			if(r.message){
				frm.set_value("taxes_and_charges", r.message)
			}
		}
	});
}

erpnext.utils.get_contact_details = function(frm) {
	if(frm.updating_party_details) return;

	if(frm.doc["contact_person"]) {
		frappe.call({
			method: "frappe.contacts.doctype.contact.contact.get_contact_details",
			args: {contact: frm.doc.contact_person },
			callback: function(r) {
				if(r.message)
					frm.set_value(r.message);
			}
		})
	}
}

erpnext.utils.validate_mandatory = function(frm, label, value, trigger_on) {
	if(!value) {
		frm.doc[trigger_on] = "";
		refresh_field(trigger_on);
		frappe.msgprint(__("Please enter {0} first", [label]));
		return false;
	}
	return true;
}

erpnext.utils.get_shipping_address = function(frm, callback){
	if (frm.doc.company) {
		frappe.call({
			method: "frappe.contacts.doctype.address.address.get_shipping_address",
			args: {
				company: frm.doc.company,
				address: frm.doc.shipping_address
			},
			callback: function(r){
				if(r.message){
					frm.set_value("shipping_address", r.message[0]) //Address title or name
					frm.set_value("shipping_address_display", r.message[1]) //Address to be displayed on the page
				}

				if(callback){
					return callback();
				}
			}
		});
	} else {
		frappe.msgprint(__("Select company first"));
	}
}
