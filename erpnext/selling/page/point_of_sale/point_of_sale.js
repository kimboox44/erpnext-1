/* global Clusterize */
frappe.provide('erpnext.pos');
!function(t,e){"object"==typeof exports?module.exports=e(t):"function"==typeof define&&define.amd?define([],e):t.LazyLoad=e(t)}("undefined"!=typeof global?global:this.window||this.global,function(t){"use strict";function e(t,e){this.settings=s(r,e||{}),this.images=t||document.querySelectorAll(this.settings.selector),this.observer=null,this.init()}"function"==typeof define&&define.amd&&(t=window);const r={src:"data-src",srcset:"data-srcset",selector:".lazyload",root:null,rootMargin:"0px",threshold:0},s=function(){let t={},e=!1,r=0,o=arguments.length;"[object Boolean]"===Object.prototype.toString.call(arguments[0])&&(e=arguments[0],r++);for(;r<o;r++)!function(r){for(let o in r)Object.prototype.hasOwnProperty.call(r,o)&&(e&&"[object Object]"===Object.prototype.toString.call(r[o])?t[o]=s(!0,t[o],r[o]):t[o]=r[o])}(arguments[r]);return t};if(e.prototype={init:function(){if(!t.IntersectionObserver)return void this.loadImages();let e=this,r={root:this.settings.root,rootMargin:this.settings.rootMargin,threshold:[this.settings.threshold]};this.observer=new IntersectionObserver(function(t){Array.prototype.forEach.call(t,function(t){if(t.isIntersecting){e.observer.unobserve(t.target);let r=t.target.getAttribute(e.settings.src),s=t.target.getAttribute(e.settings.srcset);"img"===t.target.tagName.toLowerCase()?(r&&(t.target.src=r),s&&(t.target.srcset=s)):t.target.style.backgroundImage="url("+r+")"}})},r),Array.prototype.forEach.call(this.images,function(t){e.observer.observe(t)})},loadAndDestroy:function(){this.settings&&(this.loadImages(),this.destroy())},loadImages:function(){if(!this.settings)return;let t=this;Array.prototype.forEach.call(this.images,function(e){let r=e.getAttribute(t.settings.src),s=e.getAttribute(t.settings.srcset);"img"===e.tagName.toLowerCase()?(r&&(e.src=r),s&&(e.srcset=s)):e.style.backgroundImage="url('"+r+"')"})},destroy:function(){this.settings&&(this.observer.disconnect(),this.settings=null)}},t.lazyload=function(t,r){return new e(t,r)},t.jQuery){const r=t.jQuery;r.fn.lazyload=function(t){return t=t||{},t.attribute=t.attribute||"data-src",new e(r.makeArray(this),t),this}}return e});



/*
 * jQuery appear plugin
 *
 * Copyright (c) 2012 Andrey Sidorov
 * licensed under MIT license.
 *
 * https://github.com/morr/jquery.appear/
 *
 * Version: 0.3.3
 */
 

frappe.pages['point-of-sale'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Point of Sale',
		single_column: true
	});

	frappe.db.get_value('POS Settings', {name: 'POS Settings'}, 'is_online', (r) => {
		if (r && !cint(r.use_pos_in_offline_mode)) {
			// online
			wrapper.pos = new erpnext.pos.PointOfSale(wrapper);
			window.cur_pos = wrapper.pos;
		} else {
			// offline
			frappe.flags.is_offline = true;
			frappe.set_route('pos');
		}
	});


};

frappe.pages['point-of-sale'].refresh = function(wrapper) {
	if (wrapper.pos) {
		wrapper.pos.make_new_invoice();
	}

	if (frappe.flags.is_offline) {
		frappe.set_route('pos');
	}
}

erpnext.pos.PointOfSale = class PointOfSale {
	constructor(wrapper) {
		this.wrapper = $(wrapper).find('.layout-main-section');
		this.page = wrapper.page;

		const assets = [
			'assets/erpnext/js/pos/clusterize.js',
			'assets/erpnext/css/pos.css'
		];

		frappe.require(assets, () => {
			this.make();
		});
		
	}

	make() {
		return frappe.run_serially([
			() => frappe.dom.freeze(),
			() => {
				this.prepare_dom();
				this.prepare_menu();
				this.set_online_status();
			},
			() => this.make_new_invoice(),
			() => {
				if(!this.frm.doc.company) {
					this.setup_company()
						.then((company) => {
							this.frm.doc.company = company;
							this.get_pos_profile();
						});
				}
			},
			() => {
				frappe.dom.unfreeze();
			},
			() => this.page.set_title(__('Point of Sale'))
		]);
	}

	get_pos_profile() {
		var me = this;
		return frappe.xcall("erpnext.stock.get_item_details.get_pos_profile",
			{'company': this.frm.doc.company})
			.then((r) => {
				if(r) {
					this.frm.doc.pos_profile = r.name;
					this.set_pos_profile_data()
						.then(() => {
							this.on_change_pos_profile();
						});
					
				} else {
					this.raise_exception_for_pos_profile();
				}
		});
	}

	set_online_status() {
		this.connection_status = false;
		 
		this.page.set_indicator("Hors Ligne", "grey");
		frappe.call({
			method: "frappe.handler.ping",
			callback: r => {
				if (r.message) {
					this.connection_status = true;
					this.page.set_indicator("En Ligne", "green");
				}
			}
		});
	}

	raise_exception_for_pos_profile() {
		setTimeout(() => frappe.set_route('List', 'POS Profile'), 2000);
		frappe.throw(__("POS Profile is required to use Point-of-Sale"));
	}

	prepare_dom() {
		this.wrapper.append(`
			<div class="pos">
				<section class="cart-container">

				</section>
				<section class="item-container">

				</section>
			</div>
		`);
	}

	make_cart() {
		 
		this.cart = new POSCart({
			frm: this.frm,
			wrapper: this.wrapper.find('.cart-container'),
			events: {
				 
				on_customer_change: (customer) => {
					this.frm.set_value('customer', customer);
					this.cart.reset_cart();
					this.items.reset_search_field();
					if(this.items && this.frm.doc.pos_profile) {
						this.items.reset_items();
					}
				},
				on_field_change: (item_code, field, value, batch_no) => {
					this.update_item_in_cart(item_code, field, value, batch_no);
				},
				on_numpad: (value) => {
					if (value == __('Pay') && this.frm.doc.allow_pay ) {
						if (!this.payment) {
							this.make_payment_modal();
						} else {
							this.frm.doc.payments.map(p => {
								this.payment.dialog.set_value(p.mode_of_payment, p.amount);
							});

							this.payment.set_title();
						}
						this.payment.open_modal();
					}
				},
				on_select_change: () => {
					this.cart.numpad.set_inactive();
					this.set_form_action();
				},
				get_item_details: (item_code) => {
					return this.items.get(item_code);
				},
				get_loyalty_details: () => {
					var me = this;
					if (this.frm.doc.customer) {
						frappe.call({
							method: "erpnext.accounts.doctype.loyalty_program.loyalty_program.get_loyalty_program_details",
							args: {
								"customer": me.frm.doc.customer,
								"expiry_date": me.frm.doc.posting_date,
								"company": me.frm.doc.company,
								"silent": true
							},
							callback: function(r) {
								if (r.message.loyalty_program && r.message.loyalty_points) {
									me.cart.events.set_loyalty_details(r.message, true);
								}
								if (!r.message.loyalty_program) {
									var loyalty_details = {
										loyalty_points: 0,
										loyalty_program: '',
										expense_account: '',
										cost_center: ''
									}
									me.cart.events.set_loyalty_details(loyalty_details, false);
								}
							}
						});
					}
				},
				set_loyalty_details: (details, view_status) => {
					if (view_status) {
						this.cart.available_loyalty_points.$wrapper.removeClass("hide");
					} else {
						this.cart.available_loyalty_points.$wrapper.addClass("hide");
					}
					this.cart.available_loyalty_points.set_value(details.loyalty_points);
					this.cart.available_loyalty_points.refresh_input();
					this.frm.set_value("loyalty_program", details.loyalty_program);
					this.frm.set_value("loyalty_redemption_account", details.expense_account);
					this.frm.set_value("loyalty_redemption_cost_center", details.cost_center);
				}
			}
		});
		
		this.$btn_payer = this.wrapper.find('.btn-payer');
		this.$btn_payer.on('click', () => {	
			if (!this.payment) {
				this.make_payment_modal();
			} else {
				this.frm.doc.payments.map(p => {
					this.payment.dialog.set_value(p.mode_of_payment, p.amount);
				});

				this.payment.set_title();
			}
			this.payment.open_modal();
		});

		frappe.ui.form.on('Sales Invoice', 'selling_price_list', (frm) => {
			if(this.items && frm.doc.pos_profile) {
				this.items.reset_items();
			}
		})
		
		frappe.ui.keys.on('ctrl+q', () => {
			if (!this.payment) {
				this.make_payment_modal();
			} else {
				this.frm.doc.payments.map(p => {
					this.payment.dialog.set_value(p.mode_of_payment, p.amount);
				});

				this.payment.set_title();
			}
			this.payment.open_modal();
		});
		
		//cree_commande()
		//frappe.ui.keys.on('ctrl+b', () => {
			 
		//	this.cart.cree_commande();
		//});
		//cree_commande()
		//frappe.ui.keys.on('ctrl+x', () => {
			 
		//	this.cart.cree_devis();
		//});
	}

	toggle_editing(flag) {
		let disabled;
		if (flag !== undefined) {
			disabled = !flag;
		} else {
			disabled = this.frm.doc.docstatus == 1 ? true: false;
		}
		const pointer_events = disabled ? 'none' : 'inherit';

		this.wrapper.find('input, button, select').prop("disabled", disabled);
		this.wrapper.find('.number-pad-container').toggleClass("hide", disabled);

		this.wrapper.find('.cart-container').css('pointer-events', pointer_events);
		this.wrapper.find('.item-container').css('pointer-events', pointer_events);

		this.page.clear_actions();
	}

	make_items() {
		this.items = new POSItems({
			wrapper: this.wrapper.find('.item-container'),
			frm: this.frm,
			events: {
				update_cart: (item, field, value,from_search=0) => {
					if(!this.frm.doc.customer) {
						frappe.throw(__('Please select a customer'));
					}
					this.update_item_in_cart(item, field, value,null,from_search);
					this.cart && this.cart.unselect_all();
				}
			}
		});
	}

	update_item_in_cart(item_code, field='qty', value=1, batch_no,from_search=0) {
		frappe.dom.freeze();
		if(this.cart.exists(item_code, batch_no)) {
			if(from_search == 1) {
				alert("Article existe deja !");	
				frappe.dom.unfreeze();
				return;
			}
			const search_field = batch_no ? 'batch_no' : 'item_code';
			const search_value = batch_no || item_code;
			const item = this.frm.doc.items.find(i => i[search_field] === search_value);
			frappe.flags.hide_serial_batch_dialog = false;

			if (typeof value === 'string' && !in_list(['serial_no', 'batch_no'], field)) {
				// value can be of type '+1' or '-1'
				value = item[field] + flt(value);
			}

			if(field === 'serial_no') {
				value = item.serial_no + '\n'+ value;
			}

			// if actual_batch_qty and actual_qty if there is only one batch. In such
			// a case, no point showing the dialog
			const show_dialog = item.has_serial_no || item.has_batch_no;

			if (show_dialog && field == 'qty' && ((!item.batch_no && item.has_batch_no) ||
				(item.has_serial_no) || (item.actual_batch_qty != item.actual_qty)) ) {
				this.select_batch_and_serial_no(item);
			} else {
				this.update_item_in_frm(item, field, value)
					.then(() => {
						// update cart
						this.update_cart_data(item);
						this.set_form_action();
					});
			}
			return;
		}
		   $("img.lazyload").lazyload({ 
			effect: "fadeIn" 
		    }).removeClass("lazy");
		
		let args = { item_code: item_code };
		if (field == "qty"){
			if (typeof value === 'string' && !in_list(['serial_no', 'batch_no'], field)) {
				// value can be of type '+1' or '-1'
				if(value.includes("+")){
					value = value.replace("+","");
					value = flt(value);
				} else{
					value = flt(value);
				}				
			}
			args['qty'] = value;
		}
		if (in_list(['serial_no', 'batch_no'], field)) {
			args[field] = value;
		}

		// add to cur_frm
		
		//let item = this.frm.add_child('items');
		//item['item_code']=item_code;
		//frappe.model.set_value("Sales Invoice Item", item.name, "item_code", item_code);
		let origin_item = this.items.get(args['item_code']);
		//console.log(item, args,origin_item);
		if (field == "qty" &&  parseFloat(origin_item.actual_qty) < args['qty'] &&  parseFloat(origin_item.qts_depot) < args['qty']) {
			alert("Qts d'article non disponible");
			frappe.dom.unfreeze();
			return;
		}
		if(parseFloat(origin_item.qts_depot) <=0 && parseFloat(origin_item.actual_qty) <=0) {
			alert("Qts d'article non disponible");
			frappe.dom.unfreeze();
			return;
		}
		if(origin_item.price_not_ready ==1) {
			alert("Prix d'article non disponible");
			frappe.dom.unfreeze();
			return;
		}
		const item = this.frm.add_child('items', args);
		frappe.flags.hide_serial_batch_dialog = true;
		
		
		frappe.run_serially([
			() => this.frm.script_manager.trigger('item_code', item.doctype, item.name),
			//() => this.frm.validate(),
			() => {
				 
				const show_dialog = item.has_serial_no || item.has_batch_no;

				// if actual_batch_qty and actual_qty if then there is only one batch. In such
				// a case, no point showing the dialog
				if (show_dialog && field == 'qty' && ((!item.batch_no && item.has_batch_no) ||
					(item.has_serial_no) || (item.actual_batch_qty != item.actual_qty)) ) {
					// check has serial no/batch no and update cart
					this.select_batch_and_serial_no(item);
				} else {
					// update cart
					this.update_cart_data(item);
				}
			}
		]);
	}

	select_batch_and_serial_no(row) {
		frappe.dom.unfreeze();

		erpnext.show_serial_batch_selector(this.frm, row, () => {
			this.frm.doc.items.forEach(item => {
				this.update_item_in_frm(item, 'qty', item.qty)
					.then(() => {
						// update cart
						frappe.run_serially([
							() => {
								if (item.qty === 0) {
									frappe.model.clear_doc(item.doctype, item.name);
								}
							},
							() => this.update_cart_data(item)
						]);
					});
			})
		}, () => {
			this.on_close(row);
		}, true);
	}

	on_close(item) {
		if (!this.cart.exists(item.item_code, item.batch_no) && item.qty) {
			frappe.model.clear_doc(item.doctype, item.name);
		}
	}

	update_cart_data(item) {
		this.cart.add_item(item);
		this.cart.update_taxes_and_totals();
		this.cart.update_grand_total();
		this.cart.update_qty_total();
		frappe.dom.unfreeze();
	}

	update_item_in_frm(item, field, value) {
		if (field == 'qty' && value < 0) {
			frappe.msgprint(__("Quantity must be positive"));
			value = item.qty;
		} else {
			if (in_list(["qty", "serial_no", "batch"], field)) {
				item[field] = value;
				if (field == "serial_no" && value) {
					let serial_nos = value.split("\n");
					item["qty"] = serial_nos.filter(d => {
						return d!=="";
					}).length;
				}
			} else {
				return frappe.model.set_value(item.doctype, item.name, field, value);
			}
		}

		return this.frm.script_manager.trigger('qty', item.doctype, item.name)
			.then(() => {
				if (field === 'qty' && item.qty === 0) {
					frappe.model.clear_doc(item.doctype, item.name);
				}
			})

		return Promise.resolve();
	}

	make_payment_modal() {
		this.payment = new Payment({
			frm: this.frm,
			events: {
				submit_form: () => {
					this.submit_sales_invoice();
				}
			}
		});
	}

	submit_sales_invoice() {
		this.frm.savesubmit()
			.then((r) => {
				if (r && r.doc) {
					this.frm.doc.docstatus = r.doc.docstatus;
					frappe.show_alert({
						indicator: 'green',
						message: __(`Sales invoice ${r.doc.name} created succesfully`)
					});

					this.toggle_editing();
					this.set_form_action();
					this.set_primary_action_in_modal();
				}
			});
	}

	set_primary_action_in_modal() {
		if (!this.frm.msgbox) {
			this.frm.msgbox = frappe.msgprint(
				`<a class="btn btn-primary" onclick="cur_frm.print_preview.printit(true)" style="margin-right: 5px;">
					${__('Print')}</a>
				<a class="btn btn-default">
					${__('New')}</a>`
			);

			$(this.frm.msgbox.body).find('.btn-default').on('click', () => {
				this.frm.msgbox.hide();
				this.make_new_invoice();
			})
		}
	}

	change_pos_profile() {
		return new Promise((resolve) => {
			const on_submit = ({ pos_profile, set_as_default }) => {
				if (pos_profile) {
					this.pos_profile = pos_profile;
				}

				if (set_as_default) {
					frappe.call({
						method: "erpnext.accounts.doctype.pos_profile.pos_profile.set_default_profile",
						args: {
							'pos_profile': pos_profile,
							'company': this.frm.doc.company
						}
					}).then(() => {
						this.on_change_pos_profile();
					});
				} else {
					this.on_change_pos_profile();
				}
			}

			frappe.prompt(this.get_prompt_fields(),
				on_submit,
				__('Select POS Profile')
			);
		});
	}

	on_change_pos_profile() {
		return frappe.run_serially([
			() => this.make_sales_invoice_frm(),
			() => {
				this.frm.doc.pos_profile = this.pos_profile;
				this.set_pos_profile_data()
					.then(() => {
						this.reset_cart();
						if (this.items) {
							this.items.reset_items();
						}
					});
			}
		]);
	}

	get_prompt_fields() {
		return [{
			fieldtype: 'Link',
			label: __('POS Profile'),
			options: 'POS Profile',
			fieldname: 'pos_profile',
			reqd: 1,
			get_query: () => {
				return {
					query: 'erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query',
					filters: {
						company: this.frm.doc.company
					}
				};
			}
		}, {
			fieldtype: 'Check',
			label: __('Set as default'),
			fieldname: 'set_as_default'
		}];
	}

	setup_company() {
		return new Promise(resolve => {
			if(!this.frm.doc.company) {
				frappe.prompt({fieldname:"company", options: "Company", fieldtype:"Link",
					label: __("Select Company"), reqd: 1}, (data) => {
						this.company = data.company;
						resolve(this.company);
				}, __("Select Company"));
			} else {
				resolve();
			}
		})
	}

	make_new_invoice() {
		return frappe.run_serially([
			() => this.make_sales_invoice_frm(),
			() => this.set_pos_profile_data(),
			() => {
				if (this.cart) {
					this.cart.frm = this.frm;
					this.cart.reset();
				} else {
					this.make_items();
					this.make_cart();
				}
				this.toggle_editing(true);
			},
		]);
	}

	reset_cart() {
		this.cart.frm = this.frm;
		this.cart.reset();
		this.items.reset_search_field();
	}

	make_sales_invoice_frm() {
		const doctype = 'Sales Invoice';
		return new Promise(resolve => {
			if (this.frm) {
				this.frm = get_frm(this.frm);
				if(this.company) {
					this.frm.doc.company = this.company;
				}

				resolve();
			} else {
				frappe.model.with_doctype(doctype, () => {
					this.frm = get_frm();
					resolve();
				});
			}
		});

		function get_frm(_frm) {
			const page = $('<div>');
			const frm = _frm || new _f.Frm(doctype, page, false);
			const name = frappe.model.make_new_doc_and_get_name(doctype, true);
			frm.refresh(name);
			frm.doc.items = [];
			frm.doc.is_pos = 1;

			return frm;
		}
	}

	set_pos_profile_data() {
		if (this.company) {
			this.frm.doc.company = this.company;
		}

		if (!this.frm.doc.company) {
			return;
		}

		return new Promise(resolve => {
			return this.frm.call({
				doc: this.frm.doc,
				method: "set_missing_values",
			}).then((r) => {
				if(!r.exc) {
					if (!this.frm.doc.pos_profile) {
						frappe.dom.unfreeze();
						this.raise_exception_for_pos_profile();
					}
					this.frm.script_manager.trigger("update_stock");
					frappe.model.set_default_values(this.frm.doc);
					this.frm.cscript.calculate_taxes_and_totals();

					if (r.message) {
						//console.log("m",r.message);
						this.frm.allow_devis = r.message.allow_devis;
						this.frm.show_qts_btn = r.message.show_qts_btn;
						this.frm.allow_pay = r.message.allow_pay;
						this.frm.meta.default_print_format = r.message.print_format || "";
						this.frm.allow_edit_rate = r.message.allow_edit_rate;
						this.frm.allow_edit_discount = r.message.allow_edit_discount;
						this.frm.doc.campaign = r.message.campaign;
					}
				}

				resolve();
			});
		});
	}

	prepare_menu() {
		var me = this;
		this.page.clear_menu();

		// for mobile
		// this.page.add_menu_item(__("Pay"), function () {
		//
		// }).addClass('visible-xs');
		this.page.add_menu_item("Effacer tous", function () {
			me.make_new_invoice();
			me.reset_cart();
			//me.make_items();
		});	
		this.page.add_menu_item(__("Form View"), function () {
			//console.log(me.frm.doc.items);
			frappe.model.sync(me.frm.doc);
			frappe.set_route("Form", me.frm.doc.doctype, me.frm.doc.name);
		});

		this.page.add_menu_item(__("POS Profile"), function () {
			frappe.set_route('List', 'POS Profile');
		});

		this.page.add_menu_item(__('POS Settings'), function() {
			frappe.set_route('Form', 'POS Settings');
		});

		this.page.add_menu_item(__('Change POS Profile'), function() {
			me.change_pos_profile();
		});
		this.page.add_menu_item(__('Close the POS'), function() {
			var voucher = frappe.model.get_new_doc('POS Closing Voucher');
			voucher.pos_profile = me.frm.doc.pos_profile;
			voucher.user = frappe.session.user;
			voucher.company = me.frm.doc.company;
			voucher.period_start_date = me.frm.doc.posting_date;
			voucher.period_end_date = me.frm.doc.posting_date;
			voucher.posting_date = me.frm.doc.posting_date;
			frappe.set_route('Form', 'POS Closing Voucher', voucher.name);
		});
	}

	set_form_action() {
		if(this.frm.doc.docstatus == 1 || (this.frm.doc.allow_print_before_pay == 1&&this.frm.doc.items.length>0)){
			this.page.set_secondary_action(__("Print"), async() => {
				if(this.frm.doc.docstatus != 1 ){
					await this.frm.save();
				}
				this.frm.print_preview.printit(true);
			});
		}
		if(this.frm.doc.items.length == 0){
			this.page.clear_secondary_action();
		}
		this.page.set_primary_action(__("New"), () => {
				this.make_new_invoice();
		});
		if (this.frm.doc.docstatus == 1) {
			
			this.page.add_menu_item(__("Email"), () => {
				this.frm.email_doc();
			});
		}
	}
};

const [Qty,Disc,Rate,Del,Pay] = [__("Qty"), __('Disc'), __('Rate'), __('Del'), __('Pay')];

class POSCart {
	constructor({frm, wrapper, events}) {
		this.frm = frm;
		this.item_data = {};
		this.wrapper = wrapper;
		this.events = events;
		this.make();
		this.bind_events();
	}

	make() {
		this.make_dom();
		this.make_customer_field();
		this.make_loyalty_points();
		this.make_numpad();
	}

	make_dom() {
		var dv = '';
		var payer = '';
		if(this.frm.allow_devis){
			dv = `<button  data-label="devis" class="btn btn-default btn btn-devis" style="margin: 20px 2px 0px 2px;">Devis</button>`;
	
		}
		if(this.frm.allow_pay){
			payer = `<button  data-label="payer" class="btn btn-primary  btn btn-payer brand-primary" style="margin: 20px 2px 0px 2px;">Payer</button>`;
	
		}
		this.wrapper.append(`
			<div class="pos-cart">
				<div class="customer-info" style="display:flex;background-color:#F0FBFA;border-radius:20px;padding:10px">
				</div>

				<div style="display:flex">
					<div class="customer-field" style="width:84% ">
					</div>
					<div  style="width:8% ">
                                           <button  class="btn btn-default btn-xs btn-customer-delete" style="margin-left: 5px;margin-top:30px"><i class="fa fa-close"></i></button>

					</div>
					<div  style="width:8% ">
                                           <button  class="btn btn-default btn-xs btn-reliquat" style="margin-left: 5px;margin-top:30px">R</button>

					</div>
				</div>
				<div class="grand-total">
							${this.get_grand_total()}
				 </div>
				<div class="fields">
					<div class="cart-search" style="width:25%">
					</div>
					<div   style="width:75%">
						${payer}
						<button  data-label="commander" class="btn btn-default btn btn-commander" style="margin: 20px 2px 0px 2px;">Commander</button>
						${dv}
						<button  data-label="address_magasin" class="btn btn-default btn btn-address-magasin" style="margin: 20px 2px 0px 2px;">@</button>

					</div>
						
				</div>
				<div class="cart-wrapper">
					<div class="list-item-table">
						<div class="list-item list-item--head">
							<div class="list-item__content list-item__content--flex-1.5 text-muted">${__('Item Name')}</div>
							<div class="list-item__content text-muted text-right">${__('Quantity')}</div>
							<div class="list-item__content text-muted text-right">${__('Discount')}</div>
							<div class="list-item__content text-muted text-right">${__('Rate')}</div>
						</div>
						<div class="cart-items" style="min-height:600px"> 
							<div class="empty-state">
								<span>${__('No Items added to cart')}</span>
							</div>
						</div>
						<div class="taxes-and-totals">
							${this.get_taxes_and_totals()}
						</div>
						<div class="discount-amount">`+
						(!this.frm.allow_edit_discount ? `` : `${this.get_discount_amount()}`)+
						`</div>
						
						<div class="quantity-total">
							${this.get_item_qty_total()}
						</div>
					</div>
				</div>
				<div class="row">
					<div class="number-pad-container col-sm-6"></div>
					<div class="col-sm-6">
						<div class="loyalty-program-section">
							<div class="loyalty-program-field"> </div>
						</div>
						
						
					</div>
				</div>
			</div>
		`);


		this.$cart_items = this.wrapper.find('.cart-items');
		this.$empty_state = this.wrapper.find('.cart-items .empty-state');
		this.$taxes_and_totals = this.wrapper.find('.taxes-and-totals');
		this.$discount_amount = this.wrapper.find('.discount-amount');
		this.$grand_total = this.wrapper.find('.grand-total');
		this.$qty_total = this.wrapper.find('.quantity-total');
		this.$btn_commander = this.wrapper.find('.btn-commander');
		this.$btn_devis = this.wrapper.find('.btn-devis');
		this.$btn_address_magasin = this.wrapper.find('.btn-address-magasin');

		// this.$loyalty_button = this.wrapper.find('.loyalty-button');

		// this.$loyalty_button.on('click', () => {
		// 	this.loyalty_button.show();
		// })

		this.toggle_taxes_and_totals(false);
		this.$grand_total.on('click', () => {
			this.toggle_taxes_and_totals();
		});
		const me = this;
		
		this.$btn_devis.on('click', () => {
			 
			me.cree_devis();
		});
		
		
		this.$btn_address_magasin.on('click', () => {
			 
			me.cree_address_magasin();
		});
		
		
		this.$btn_commander.on('click', () => {
			 
			me.cree_commande();
		});
		
		
		
		
	}
	
	cree_address_magasin()
	{
		var names = this.frm.doc.items.map(a => a.item_code);
		var qts = this.frm.doc.items.map(a => a.qty);
		if(!names || !this.frm.doc.pos_profile){
			return;
		}
		 
		frappe.call({
			method: "erpnext.selling.page.point_of_sale.point_of_sale.print_address_magasin",
			args: {
				"items":names,
				"qts":qts,
				"pos_profile":this.frm.doc.pos_profile,
				"customer": this.frm.doc.customer,
			},
			callback: function(r) {
				if (r.message) {
					let cmd = r.message;
					//console.log(cmd);
					var lw=window.open();
					lw.document.write(cmd);
					lw.print();
					lw.close();
				} 
			}
		});
		//var w = window.open("/api/method/erpnext.selling.page.point_of_sale.point_of_sale.print_address_magasin?"
		//		    			+"pos_profile="+this.frm.doc.pos_profile
		//		    			+"&qts="+encodeURIComponent(qts)
		//		    			+"&customer="+this.frm.doc.customer_name
		//					+"&items="+encodeURIComponent(names));
		//
		//	if(!w) {
		//		frappe.msgprint(__("Please enable pop-ups")); return;
		//	}else{
		//		console.log(w);
		//		var lw=window.open();
		//		lw.document.write(w.message);
		//		lw.print();
		//		lw.close();
		//	}
		//	
		 
	}
	
	
	cree_devis()
	{
		frappe.call({
			method: "erpnext.selling.page.point_of_sale.point_of_sale.make_devis",
			freeze: true,
			args: {
				"customer": this.frm.doc.customer,
				"items": this.frm.doc.items,
			},
			callback: function(r) {
				if (r.message) {
					let cmd = r.message;
					window.open('#Form/Quotation/'+cmd.name, '_blank', 'toolbar=0,location=0,menubar=0'); 
					 //frappe.set_route('Form', "Sales Order", cmd.name);
				} 
			}
		});
	}
	
	cree_commande()
	{	
		frappe.call({
			method: "erpnext.selling.page.point_of_sale.point_of_sale.make_sales_order",
			freeze: true,
			args: {
				"customer": this.frm.doc.customer,
				"items": this.frm.doc.items,
				"price_list" : this.frm.doc.selling_price_list,
				"pos_profile": this.frm.doc.pos_profile
			},
			callback: function(r) {
				if (r.message) {
					let cmd = r.message;
					window.open('#Form/Sales Order/'+cmd.name, '_blank', 'toolbar=0,location=0,menubar=0'); 
					 //frappe.set_route('Form', "Sales Order", cmd.name);
				} 
			}
		});
	}
	
	reset_cart() {
		this.$cart_items.find('.list-item').remove();
		this.$empty_state.show();
		this.$taxes_and_totals.html(this.get_taxes_and_totals());
		this.numpad && this.numpad.reset_value();
		 
		this.frm.msgbox = "";

		let total_item_qty = 0.0;
		this.frm.set_value("pos_total_qty",total_item_qty);

		this.$discount_amount.find('input:text').val('');
		this.wrapper.find('.grand-total-value').text(
			format_currency(this.frm.doc.grand_total, this.frm.currency,0));
		this.wrapper.find('.rounded-total-value').text(
			format_currency(this.frm.doc.rounded_total, this.frm.currency,0));
		this.$qty_total.find(".quantity-total").text(total_item_qty);

		 
		if (this.numpad) {
			const disable_btns = this.disable_numpad_control()
			let enable_btns = [__('Rate'), __('Disc')]

			if (disable_btns) {
				console.log("reset_cart");
				enable_btns = enable_btns.filter(btn => !disable_btns.includes(btn));
			}
			
			 
			this.numpad.enable_buttons(enable_btns);
		}
	}

	reset() {
		this.$cart_items.find('.list-item').remove();
		this.$empty_state.show();
		this.$taxes_and_totals.html(this.get_taxes_and_totals());
		this.numpad && this.numpad.reset_value();
		this.customer_field.set_value("");
		this.frm.msgbox = "";

		let total_item_qty = 0.0;
		this.frm.set_value("pos_total_qty",total_item_qty);

		this.$discount_amount.find('input:text').val('');
		this.wrapper.find('.grand-total-value').text(
			format_currency(this.frm.doc.grand_total, this.frm.currency,0));
		this.wrapper.find('.rounded-total-value').text(
			format_currency(this.frm.doc.rounded_total, this.frm.currency,0));
		this.$qty_total.find(".quantity-total").text(total_item_qty);

		const customer = this.frm.doc.customer;
		this.customer_field.set_value(customer);

		if (this.numpad) {
			const disable_btns = this.disable_numpad_control()
			let enable_btns = [__('Rate'), __('Disc')]

			if (disable_btns) {
				enable_btns = enable_btns.filter(btn => !disable_btns.includes(btn))
			}
			 
			this.numpad.enable_buttons(enable_btns);
		}
	}

	get_grand_total() {
		let total = this.get_total_template('Grand Total', 'grand-total-value');

		if (!cint(frappe.sys_defaults.disable_rounded_total)) {
			total += this.get_total_template('Rounded Total', 'rounded-total-value');
		}

		return total;
	}

	get_item_qty_total() {
		let total = this.get_total_template('Total Qty', 'quantity-total');
		return total;
	}

	get_total_template(label, class_name) {
		return `
			<div class="list-item" style="height: 39px;background: #dcffa6;color: black;">
				<div class="list-item__content text-muted">${__(label)}</div>
				<div class="list-item__content list-item__content--flex-2 ${class_name}">0.00</div>
			</div>
		`;
	}

	get_discount_amount() {
		const get_currency_symbol = window.get_currency_symbol;

		return `
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 text-muted">${__('Discount')}</div>
				<div class="list-item__content discount-inputs">
					<input type="text"
						class="form-control additional_discount_percentage text-right"
						placeholder="% 0.00"
					>
					<input type="text"
						class="form-control discount_amount text-right"
						placeholder="${get_currency_symbol(this.frm.doc.currency)} 0.00"
					>
				</div>
			</div>
		`;
	}

	get_taxes_and_totals() {
		return `
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 text-muted">${__('Net Total')}</div>
				<div class="list-item__content net-total">0.00</div>
			</div>
			<div class="list-item">
				<div class="list-item__content list-item__content--flex-2 text-muted">${__('Taxes')}</div>
				<div class="list-item__content taxes">0.00</div>
			</div>
		`;
	}

	toggle_taxes_and_totals(flag) {
		if (flag !== undefined) {
			this.tax_area_is_shown = flag;
		} else {
			this.tax_area_is_shown = !this.tax_area_is_shown;
		}

		this.$taxes_and_totals.toggle(this.tax_area_is_shown);
		this.$discount_amount.toggle(this.tax_area_is_shown);
	}

	update_taxes_and_totals() {
		if (!this.frm.doc.taxes) { return; }

		const currency = this.frm.doc.currency;
		this.frm.refresh_field('taxes');

		// Update totals
		this.$taxes_and_totals.find('.net-total')
			.html(format_currency(this.frm.doc.total, currency,0));

		// Update taxes
		const taxes_html = this.frm.doc.taxes.map(tax => {
			return `
				<div>
					<span>${tax.description}</span>
					<span class="text-right bold">
						${format_currency(tax.tax_amount, currency,0)}
					</span>
				</div>
			`;
		}).join("");
		this.$taxes_and_totals.find('.taxes').html(taxes_html);
	}

	update_grand_total() {
		this.$grand_total.find('.grand-total-value').text(
			format_currency(this.frm.doc.grand_total, this.frm.currency,0)
		);

		this.$grand_total.find('.rounded-total-value').text(
			format_currency(this.frm.doc.rounded_total, this.frm.currency,0)
		);
	}

	update_qty_total() {
		var total_item_qty = 0;
		$.each(this.frm.doc["items"] || [], function (i, d) {
				if (d.qty > 0) {
					total_item_qty += d.qty;
				}
		});
		this.$qty_total.find('.quantity-total').text(total_item_qty);
		this.frm.set_value("pos_total_qty",total_item_qty);
	}

	make_customer_field() {
		const wr = this.wrapper;
		var pr = this.frm.doc.pos_profile;
		 
		//cart-search
		this.cart_search = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Data',
				label: 'Chercher Article',
				placeholder: "Appuyer touche [entrée]"
			},
			parent: this.wrapper.find('.cart-search'),
			render_input: true,
		});
		
		this.cart_search.$input.on('keyup', (e) => {
			 if(this.$cart_items.length <= 0  )
			 {
				 return ;
			 }
			e.stopPropagation();
			var keycode = (e.keyCode ? e.keyCode : e.which);
			
				let search_term = $(".cart-search input").val();
				 
				const wr = this.wrapper;
				 
				//if(!this.original_items){
				//	this.original_items = this.$cart_items.clone( true );
				//	console.log("set original");
				//}

				if(!search_term || search_term == "" || keycode == '8' || keycode == '46'){
					//console.log("reset",this.original_items);
					this.$cart_items.find('.list-item').show();
					//this.$cart_items = this.original_items; 
					//$(".cart-items").replaceWith(this.$cart_items);
					//this.original_items = null;
				}else{
					
					if(keycode == '13'){
						search_term = search_term.toLowerCase();
						const $items = this.$cart_items.find(`[title*="${search_term}"]`); 

						if(!$items)
							return;
						this.$cart_items.find('.list-item').hide();
						$($items).show();
						//$items.each(function( index ) { 
						 //   $(this).appendTo(".cart-items");
						//});
					}

				}
			
		});
		var me = this;
		this.customer_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Customer',
				fieldname: 'customer',
				options: 'Customer',
				reqd: 1,
				get_query: function() {
					return {
						query: 'erpnext.controllers.queries.customer_query'
					}
				},
				onchange: () => {
					let customer = this.customer_field.get_value();
					me.frm.doc.selling_price_list = null;
					this.events.on_customer_change(customer);
					this.events.get_loyalty_details();
					
					if(customer){
						
						frappe.call({
							"method": "erpnext.selling.page.point_of_sale.point_of_sale.get_customer",
							"args": {
								"customer": customer
							},
							"callback": function(response) {
								var sinv = response.message["customer"]; 
								var bl = response.message["balance"]; 
								//console.log("bl",bl);
								frappe.call({
										"method": "erpnext.accounts.party.get_default_price_list_api",
										"args": {
											"party": sinv.name,
											"pos_profile": me.frm.doc.pos_profile
										},
										"callback": function(response) {
											if(response.message)
												me.frm.doc.selling_price_list = response.message
											
											if (sinv) {
												
												wr.find('.customer-info').html('[ Profile : '+pr+' ]<br>' +'Nom : '+(sinv.customer_name || '')+'<br>'+(sinv.customer_group || '')+'<br>'+(sinv.territory || '')+'<br>'+(sinv.mobile_no || '')+ ' -  '+(sinv.email_id || '') + '<br>' +  me.frm.doc.selling_price_list+'<br><span class="hidden">Solde : '+format_currency(bl, me.frm.doc.currency,0)+' / Limite : '+format_currency(sinv.credit_limit, me.frm.doc.currency,0)+"</span>");                                  
											}  else{
												   wr.find('.customer-info').html('');
											}
										}
										
									});
								
								
							}
							}); 
						
						
					   }else{
						   wr.find('.customer-info').html('');
					   }
				}
			},
			parent: this.wrapper.find('.customer-field'),
			render_input: true
		});

		this.customer_field.set_value(this.frm.doc.customer);
	}


	make_loyalty_points() {
		this.available_loyalty_points = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Int',
				label: 'Available Loyalty Points',
				read_only: 1,
				fieldname: 'available_loyalty_points'
			},
			parent: this.wrapper.find('.loyalty-program-field')
		});
		this.available_loyalty_points.set_value(this.frm.doc.loyalty_points);
	}


	disable_numpad_control() {
		let disabled_btns = [];
		if(!this.frm.allow_edit_rate) {
			disabled_btns.push(__('Rate'));
		}
		if(!this.frm.allow_edit_discount) {
			disabled_btns.push(__('Disc'));
		}
		//console.log(disabled_btns);
		//console.log(this.frm.allow_edit_discount);
		
		return disabled_btns;
	}


	make_numpad() {

		var pay_class = {}
		pay_class[__('Pay')]='brand-primary'
		this.numpad = new NumberPad({
			button_array: [
				[1, 2, 3, Qty],
				[4, 5, 6, Disc],
				[7, 8, 9, Rate],
				[Del, 0, '.', Pay]
			],
			add_class: pay_class,
			disable_highlight: [Qty, Disc, Rate, Pay],
			reset_btns: [Qty, Disc, Rate, Pay],
			del_btn: Del,
			disable_btns: this.disable_numpad_control(),
			wrapper: this.wrapper.find('.number-pad-container'),
			onclick: (btn_value) => {
				// on click

				if (!this.selected_item && btn_value !== Pay) {
					frappe.show_alert({
						indicator: 'red',
						message: __('Please select an item in the cart')
					});
					return;
				}
				if ([Qty, Disc, Rate].includes(btn_value)) {
					this.set_input_active(btn_value);
				} else if (btn_value !== Pay) {
					if (!this.selected_item.active_field) {
						frappe.show_alert({
							indicator: 'red',
							message: __('Please select a field to edit from numpad')
						});
						return;
					}

					if (this.selected_item.active_field == 'discount_percentage' && this.numpad.get_value() > cint(100)) {
						frappe.show_alert({
							indicator: 'red',
							message: __('Discount amount cannot be greater than 100%')
						});
						this.numpad.reset_value();
					} else {
						const item_code = unescape(this.selected_item.attr('data-item-code'));
						const batch_no = this.selected_item.attr('data-batch-no');
						const field = this.selected_item.active_field;
						const value = this.numpad.get_value();

						this.events.on_field_change(item_code, field, value, batch_no);
					}
				}

				this.events.on_numpad(btn_value);
			}
		});
	}

	set_input_active(btn_value) {
		this.selected_item.removeClass('qty disc rate');

		this.numpad.set_active(btn_value);
		if (btn_value === Qty) {
			this.selected_item.addClass('qty');
			this.selected_item.active_field = 'qty';
		} else if (btn_value == Disc) {
			this.selected_item.addClass('disc');
			this.selected_item.active_field = 'discount_percentage';
		} else if (btn_value == Rate) {
			this.selected_item.addClass('rate');
			this.selected_item.active_field = 'rate';
		}
	}

	add_item(item) {
		this.$empty_state.hide();

		if (this.exists(item.item_code, item.batch_no)) {
			// update quantity
			this.update_item(item);
		} else if (flt(item.qty) > 0.0) {
			// add to cart
			const $item = $(this.get_item_html(item));
			//$item.appendTo(this.$cart_items);
			//prependTo
			$item.prependTo(this.$cart_items);
		}
		this.highlight_item(item.item_code);
		this.scroll_to_item(item.item_code);
	}

	update_item(item) {
		const item_selector = item.batch_no ?
			`[data-batch-no="${item.batch_no}"]` : `[data-item-code="${escape(item.item_code)}"]`;

		const $item = this.$cart_items.find(item_selector);

		if(item.qty > 0) {
			var me = this;
			if (!this.item_data[item.item_code]) {
				this.item_data[item.item_code] = this.events.get_item_details(item.item_code);
			}

			var result = this.item_data[item.item_code];
			 
			frappe.call({
				"method": "erpnext.selling.page.point_of_sale.point_of_sale.get_price_info",
				"args" : { 
						"customer":me.frm.doc.customer, 
						"price_list":me.frm.doc.selling_price_list,
						"transaction_date": me.frm.doc.posting_date,
						"qty": item.qty,
						"uom": "Unite",
						"item_code":item.item_code
					} ,
				"callback": function(response) { 
					if(response.message)
					{ 
						result.price_list_rate  = response.message; 
						const _item =result;//this.get_item_details_cart(item.item_code,item.qty);
						const is_stock_item = _item.is_stock_item;
						const indicator_class = (!is_stock_item || item.actual_qty >= item.qty) ? 'green' : 'red';
						const remove_class = indicator_class == 'green' ? 'red' : 'green';
						  
						if(item.rate != _item.price_list_rate){  
							$item.find('.remise').text("Ancien : "+format_currency(item.rate, me.frm.doc.currency,0));
							item.rate = _item.price_list_rate;  
						}else{
							$item.find('.remise').text('');
						}
						const amount = item.rate * item.qty;
						$item.find('.quantity input').val(item.qty);
						$item.find('.discount input').val(item.discount_percentage);
						$item.find('.rate').text(format_currency(item.rate, me.frm.doc.currency,0));
						$item.find('.item-amount').text(format_currency(amount || 0, me.frm.doc.currency,0));


						$item.addClass(indicator_class);
						$item.removeClass(remove_class);
					}
				}

			}); 

			 
			
		} else {
			$item.remove();
		}
	}

	get_item_html(item) {
		
		let origin_item = this.get_item_details(item.item_code);

		const is_stock_item =origin_item.is_stock_item;
		const rate = format_currency(item.rate, this.frm.doc.currency,0);
		const price_list_rate = format_currency(item.price_list_rate, this.frm.doc.currency,0);
		const amount = format_currency(item.amount, this.frm.doc.currency,0);
		//console.log("item",item);
		const indicator_class = (!is_stock_item || item.actual_qty >= item.qty) ? 'green' : 'red';
		const batch_no = item.batch_no || '';
		let fabricant = origin_item.manufacturer || '';
		let ref_fabricant = origin_item.manufacturer_part_no || '';
		let adresse = origin_item.adresse || '';
		let remise = '';
		if(item.rate!=item.price_list_rate)
			remise = '(${price_list_rate})';
		
		var rm ="";
		if(this.frm.allow_edit_discount)
		rm = `Rem <input class="form-control" type="number" value="${item.discount_percentage}"> %`
		
		return `
			<div style="border-bottom: solid 1px #d1d8dd;" class="list-item indicator ${indicator_class}" data-item-code="${escape(item.item_code)}"
				data-batch-no="${batch_no}" title="Item: ${item.item_name.toLowerCase()} ${fabricant.toLowerCase()} ${ref_fabricant.toLowerCase()} Available Qty: ${item.actual_qty}" >
				<div class="item-name   " style="flex-grow:1">
					<div>${this.frm.doc.items.length} - ${item.item_name}</div>
					<div> ${fabricant} ${ref_fabricant}   [ ${adresse} ]    </div>
					<div style="margin-top:5px">
						 
						
						<button data-item-code="${escape(item.item_code)}" data-label="information" class="btn btn-default btn-xs btn-information" style="margin-right: 5px;"><i class="fa fa-question"></i>
						</button>
						<button data-item-code="${escape(item.item_code)}" data-label="cart-delete" class="btn btn-danger btn-xs btn-cart-delete" style="margin-left: 5px;"><i class="fa fa-close"></i></button>

					</div>
				</div>
				<div class=" text-right" style="margin:10px">
				<div class="quantity list-item__content text-right">
					${get_quantity_html(item.qty)}
				</div>
				<div class="discount list-item__content text-right">
					${rm}
					
				</div>
				<div class="rate list-item__content text-right">
					${rate}
				</div> 
				<div class="remise list-item__content text-right">
				 	${remise}
				</div> 
					

					<div class="item-amount list-item__content text-right" style="text-size:14px;font-weight:800;color: red;"> ${amount} </div>
				</div>	
				
			</div>
		`;
			//Remise : ${item.discount_percentage}%
		function get_quantity_html(value) {
			return `
				<div class="input-group input-group-xs">
					<span class="input-group-btn">
						<button class="btn btn-default btn-xs" data-action="increment">+</button>
					</span>

					<input class="form-control" type="number" value="${value}">

					<span class="input-group-btn">
						<button class="btn btn-default btn-xs" data-action="decrement">-</button>
					</span>
				</div>
			`;
		}
	}

	get_item_details(item_code) {
		if (!this.item_data[item_code]) {
			this.item_data[item_code] = this.events.get_item_details(item_code);
		}

		return this.item_data[item_code];
	}
	
	get_item_details_cart(item_code,qty) {
		
		
		// update price
		//price_list_rate
		
		
		
	}

	exists(item_code, batch_no) {
		const is_exists = batch_no ?
			`[data-batch-no="${batch_no}"]` : `[data-item-code="${escape(item_code)}"]`;

		let $item = this.$cart_items.find(is_exists);

		return $item.length > 0;
	}

	highlight_item(item_code) {
		const $item = this.$cart_items.find(`[data-item-code="${escape(item_code)}"]`);
		$item.addClass('highlight');
		setTimeout(() => $item.removeClass('highlight'), 1000);
	}

	scroll_to_item(item_code) {
		const $item = this.$cart_items.find(`[data-item-code="${escape(item_code)}"]`);
		if ($item.length === 0) return;
		const scrollTop = $item.offset().top - this.$cart_items.offset().top + this.$cart_items.scrollTop();
		this.$cart_items.animate({ scrollTop });
	}
 
	
	bind_events() {
		const me = this;
		const events = this.events;
		loadLazzy();
		// quantity change
		this.$cart_items.on('click',
			'[data-action="increment"], [data-action="decrement"]', function() {
				const $btn = $(this);
				const $item = $btn.closest('.list-item[data-item-code]');
				const item_code = unescape($item.attr('data-item-code'));
				const action = $btn.attr('data-action');

				if(action === 'increment') {
					events.on_field_change(item_code, 'qty', '+1');
				} else if(action === 'decrement') {
					events.on_field_change(item_code, 'qty', '-1');
				}
			});

		this.$cart_items.on('change', '.quantity input', function() {
			const $input = $(this);
			const $item = $input.closest('.list-item[data-item-code]');
			const item_code = unescape($item.attr('data-item-code'));
			events.on_field_change(item_code, 'qty', flt($input.val()));
		});
		
		this.$cart_items.on('change', '.discount input', function() {
			const $input = $(this);
			const $item = $input.closest('.list-item[data-item-code]');
			const item_code = unescape($item.attr('data-item-code'));
			//console.log(flt($input.val()));
			events.on_field_change(item_code, 'discount_percentage', flt($input.val()));
		});
		
		// btn-reliquat
		this.wrapper.on('click', '.btn-reliquat', function(event) {
			event.stopPropagation();
			let customer = me.frm.doc.customer
			window.open('/desk#query-report/Etat%20Reliquats%20Clients?customer='+customer, '_blank');
		});
		
		
		//btn-customer-delete
		this.wrapper.on('click', '.btn-customer-delete', function(event) {
			event.stopPropagation();
			  
			me.customer_field.set_value("");
			me.frm.doc.customer = "";
			me.frm.doc.items = []
			me.reset();
		});
		
		
		this.$cart_items.on('click', '.btn-cart-delete', function() {
			
			const $vitem = $(this);
			const item_code = unescape($vitem.attr('data-item-code'));
			//const item_selector = `[data-item-code="${item_code}"]`;
			
			//const $item = me.$cart_items.find(item_selector);
			//$item.remove();
			//console.log("item_code",item_code);
			events.on_field_change(item_code, 'qty', 0);
			
		});
		this.$cart_items.on('click', '.btn-open', function(event) {
			
			if(me.frm.allow_edit_rate){
				 event.stopPropagation();
				const $item = $(this);
				const item_code = unescape($item.attr('data-item-code'));
				window.open('#Form/Item/'+item_code, '_blank', 'toolbar=0,location=0,menubar=0'); 
			}else{
				alert("vous n'êtes pas autorisé");	
			}
			
			 
		});
		
		this.$cart_items.on('click', '.btn-information', function(event) {
			 event.stopPropagation();
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			erpnext.utils.open_item_info(item_code,me.frm);
			//me.open_item_info(item_code);
				 
		});
		
		
		
		

		// current item
		this.$cart_items.on('click', '.list-item', function() {
			me.set_selected_item($(this));
		});

		this.wrapper.find('.additional_discount_percentage').on('change', (e) => {
			const discount_percentage = flt(e.target.value,
				precision("additional_discount_percentage"));

			frappe.model.set_value(this.frm.doctype, this.frm.docname,
				'additional_discount_percentage', discount_percentage)
				.then(() => {
					let discount_wrapper = this.wrapper.find('.discount_amount');
					discount_wrapper.val(flt(this.frm.doc.discount_amount,
						precision('discount_amount')));
					discount_wrapper.trigger('change');
				});
		});

		this.wrapper.find('.discount_amount').on('change', (e) => {
			const discount_amount = flt(e.target.value, precision('discount_amount'));
			frappe.model.set_value(this.frm.doctype, this.frm.docname,
				'discount_amount', discount_amount);
			this.frm.trigger('discount_amount')
				.then(() => {
					this.update_discount_fields();
					this.update_taxes_and_totals();
					this.update_grand_total();
				});
		});
	}

	update_discount_fields() {
		let discount_wrapper = this.wrapper.find('.additional_discount_percentage');
		let discount_amt_wrapper = this.wrapper.find('.discount_amount');
		discount_wrapper.val(flt(this.frm.doc.additional_discount_percentage,
			precision('additional_discount_percentage')));
		discount_amt_wrapper.val(flt(this.frm.doc.discount_amount,
			precision('discount_amount')));
	}

	set_selected_item($item) {
		this.selected_item = $item;
		this.$cart_items.find('.list-item').removeClass('current-item qty disc rate');
		this.selected_item.addClass('current-item');
		this.events.on_select_change();
	}

	unselect_all() {
		this.$cart_items.find('.list-item').removeClass('current-item qty disc rate');
		this.selected_item = null;
		this.events.on_select_change();
	}
}

class POSItems {
	constructor({wrapper, frm, events}) {
		this.wrapper = wrapper;
		this.frm = frm;
		this.items = {};
		//this.last_oem = '';
		//this.last_item_modele = '';
		//this.old_query = {};
		 
		this.events = events;
		this.currency = this.frm.doc.currency;

		frappe.db.get_value("Item Group", {lft: 1, is_group: 1}, "name", (r) => {
			this.parent_item_group = r.name;
			this.make_dom();
			this.make_fields();

			this.init_clusterize();
			this.bind_events();
			this.load_items_data();
		})
	}

	load_items_data() {
		// bootstrap with 20 items
		this.get_items()
			.then(({ items }) => {
				this.all_items = items;
				this.items = items;
				this.render_items(items);
				$("img.lazyload").lazyload({ 
					effect: "fadeIn" 
				    }).removeClass("lazy");
			});
	}

	reset_items() {
		this.wrapper.find('.pos-items').empty();
		this.init_clusterize();
		//this.load_items_data();
	}
	 

	make_dom() {
		this.wrapper.html(`
			<div class="vehicule-name-wrapper" style="display:flex;background-color:#F0FBFA;border-radius:20px">
				 
				<div style="width:20% ">
				<img class="vehicule-image"   src=""   style="position: relative;top: 50%;transform: translateY(-50%);">
				</div>

				<div style="width:15% ;padding:10px">	
				<span class="strong">Marque </span>:<br>
				<span class="strong">Modele </span>:<br>
				<span class="strong">Generation </span>:<br>
				<span class="strong">Version </span>:
				</div>
				<div style="width:45% ;padding:10px">					
				 <span class="vehicule-marque-name"></span> <br>
				 <span class="vehicule-modele-name"></span> <br>
				 <span class="vehicule-generation-name"></span>  <br>
				 <span class="vehicule-version-name"></span> 
				</div>
				<div style="width:20% ;padding:10px">					
				<span class="strong">Date </span>: <br> <span class="vehicule-date"></span>  

				<br>
	 			<button  data-label="return" class="btn btn-danger btn-xs btn btn-delete">Effacer tous</button>

	 			<button  data-label="return" class="btn btn-info btn-xs btn btn-back-result">Retour</button>
				
 				<button  data-label="return" class="btn btn-default btn-xs btn btn-remove-pagination" ><i class="fa fa-trash-o"></i></button>
				<button  data-label="return" class="btn btn-default btn-xs btn btn-pagination-return" ><i class="fa fa-arrow-left"></i></button>
 				<span class="pagination"></span>
				<button  data-label="return" class="btn btn-default btn-xs btn btn-pagination" ><i class="fa fa-arrow-right"></i></button>
				<!-- <button  data-label="return" class="btn btn-default btn-xs btn btn-vente-perdue" >Vente perdue</button>  -->
				
				</div>

			</div>
			<div class="vehicule" style="display:flex">

				<div class="vehicule-marque-field" style="width:90% ">
					</div>

				<div class="vehicule-modele-field" style="width:90% ">
					</div>

				<div class="vehicule-generation-field" style="width:90% ">
					</div>
				<div class="vehicule-version-field" style="width:100% ">
					</div>
 				<button  data-label="return" class="btn btn-default btn-xs btn btn-return-vehicule" style="margin: 20px 5px 10px 5px;"><i class="fa fa-trash-o"></i></button>

				<div class="item-group-parent-field" style="width: 100%;margin-left: 10px;display:none">
				</div>
				<button  data-label="return" class="btn btn-default btn-xs btn btn-return-item-group-parent" style="margin: 20px 5px 10px 5px;display:none"><i class="fa fa-trash-o"></i></button>
 
				<div class="item-group-field" style="width: 100%;margin-left: 10px;">
				</div>
				<button  data-label="return" class="btn btn-default btn-xs btn btn-return-item-group" style="margin: 20px 5px 10px 5px;"><i class="fa fa-trash-o"></i></button>

				
				<div class="item-manufacturer-field" style="width: 100%;margin-left: 10px;">
				</div>
				<button  data-label="return" class="btn btn-default btn-xs btn btn-return-manufacturer" style="margin: 20px 5px 10px 5px;"><i class="fa fa-trash-o"></i></button>
				
				
			</div>
			<div class="fields">
				<div class="search-field">
				</div>


				<div class="item-modele-field" style="width:20% ">
					</div> 
				<div class="item-oem-field" style="width:20% ">
					</div> 
 				<button  data-label="return" class="btn btn-default btn-xs btn btn-return-oem" style="margin: 20px 5px 10px 5px;"><i class="fa fa-trash-o"></i></button>


				<button  data-label="search" class="btn btn-primary  btn-xs btn btn-dosearch" style="margin: 20px 5px 10px 5px;"><i class="fa fa-search"></i> Chercher</button>

			</div>
			<div class="items-wrapper">
			</div>
		`);

		this.items_wrapper = this.wrapper.find('.items-wrapper');
		this.items_wrapper.append(`
			<div class="list-item-table pos-items-wrapper"  id="items-wrapper-id">
				<div class="pos-items image-view-container">
				</div>
			</div>
		`);
		
		var scrolledDiv = document.getElementById("items-wrapper-id");
		scrolledDiv.onscroll = function(){
		$("img.lazyload").lazyload({ 
				effect: "fadeIn" 
			    }).removeClass("lazy");
		};
	}
	
	make_oem(){ 
		const me = this; 
		var val = this.wrapper.find('.item-oem-field');
		if(val)
			val.empty();
	 	const wr = this.wrapper;
		this.item_oem_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Data',
				label: "OEM",
				default: this.item_oem,
				placeholder: "OEM"
				
			},
			parent: this.wrapper.find('.item-oem-field'),
			render_input: true
		});
		this.item_oem_field.$input.on('input', (e) => {
			//this.last_oem = this.item_oem;
			
			 this.item_oem = e.target.value;
				 
			  this.filter_items();
			 
			 
			 
		});
		
	}
	
	make_item_modele(){ 
		const me = this; 
		var val = this.wrapper.find('.item-modele-field');
		if(val)
			val.empty();
	 	const wr = this.wrapper;
		this.item_modele_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Modele Piece',
				fieldname: 'item_modele',
				options: 'Item',
				filters: {"has_variants": 1},
				default: this.item_modele,
				onchange: () => {
					
					//this.last_item_modele = this.item_modele;
					//this.last_query['item_modele'] = this.item_modele;
					this.item_modele = this.item_modele_field.get_value();
					 
					this.filter_items();
				}, 
			},
			parent: this.wrapper.find('.item-modele-field'),
			render_input: true
		});
		
	}
	
	make_marque(){ 
		const me = this; 
		
		var val = this.wrapper.find('.vehicule-marque-field');
		if(val)
			val.empty();
	 	const wr = this.wrapper;
		wr.find('.vehicule-marque-name').text('');  	
		this.vehicule_marque_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Marque',
				options: 'Marque vehicule',
				default: this.vehicule_marque,
				onchange: () => {
					//this.last_query['vehicule_marque'] = this.vehicule_marque;
					this.vehicule_marque = this.vehicule_marque_field.get_value();
					if (this.vehicule_marque) { 
						frappe.call({
							"method": "frappe.client.get",
							"args": {
								"doctype": "Marque vehicule",
								"name": this.vehicule_marque
							},
							"callback": function(response) {
								var sinv = response.message; 
								if (sinv) {
									wr.find('.vehicule-marque-name').text(sinv.marque);  
									wr.find('.vehicule-image').attr("src",sinv.image); 
									wr.find('.vehicule-date').text(''); 
									
								}  
							}
							}); 
					} else{
					wr.find('.vehicule-marque-name').text('');  	
					}
					this.filter_items();
					this.make_modele();
					this.make_generation();
					this.make_version();
				}, 
			},
			parent: this.wrapper.find('.vehicule-marque-field'),
			render_input: true
		});
		
	}
	
	make_modele(){
		const me = this;
		
		 var val = this.wrapper.find('.vehicule-modele-field');
		if(val) val.empty();
		var filter_v = this.vehicule_marque_field.get_value();
		var filter = {}
		if(filter_v) filter = {"marque_vehicule": filter_v}
		const wr = this.wrapper;
		wr.find('.vehicule-modele-name').text('');  
		this.vehicule_modele_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Modele',
				options: 'Modele de vehicule',
				default: this.vehicule_modele,
				filters: filter,
				onchange: () => {
					//this.last_query['vehicule_modele'] = this.vehicule_modele;
					this.vehicule_modele = this.vehicule_modele_field.get_value();
					if (this.vehicule_modele) {
						
						frappe.call({
						"method": "frappe.client.get",
						"args": {
							"doctype": "Modele de vehicule",
							"name": this.vehicule_modele
						},
						"callback": function(response) {
							var sinv = response.message; 
							if (sinv) {
								wr.find('.vehicule-modele-name').text(sinv.modele);  
								wr.find('.vehicule-marque-name').text(sinv.nom_marque);  
								wr.find('.vehicule-image').attr("src",sinv.logo);  
								wr.find('.vehicule-date').text(''); 
							}  
						}
						}); 
					}else{
					wr.find('.vehicule-modele-name').text('');  	
					}
					this.filter_items();
					this.make_generation();
					this.make_version();
				}, 
			},
			parent: this.wrapper.find('.vehicule-modele-field'),
			render_input: true
		});
	}

	make_generation(){
		const me = this;
		
		 var val = this.wrapper.find('.vehicule-generation-field');
		if(val) val.empty();
		var filter_v = this.vehicule_modele_field.get_value();
		var filter = {}
		if(filter_v) filter = {"modele_vehicule": filter_v}
		 const wr = this.wrapper;
		wr.find('.vehicule-generation-name').text('');  
		this.vehicule_generation_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Generation',
				options: 'Generation vehicule',
				default: this.vehicule_generation,
				filters: filter,
				onchange: () => {
					//this.last_query['vehicule_generation'] = this.vehicule_generation;
					this.vehicule_generation = this.vehicule_generation_field.get_value();
					if (this.vehicule_generation) {
						frappe.call({
						"method": "frappe.client.get",
						"args": {
							"doctype": "Generation vehicule",
							"name": this.vehicule_generation
						},
						"callback": function(response) {
							var sinv = response.message; 
							if (sinv) {
								wr.find('.vehicule-generation-name').text(sinv.generation);  
								wr.find('.vehicule-modele-name').text(sinv.nom_modele);  
								wr.find('.vehicule-marque-name').text(sinv.nom_marque);  
								wr.find('.vehicule-image').attr("src",sinv.image);  
								let debut = sinv.date_debut;
								if(sinv.date_debut)
								{
									debut=sinv.date_debut.substring(5,7)+'-'+sinv.date_debut.substring(2,4)
								}
								let fin = sinv.date_fin;
								if(sinv.date_fin)
								{
									fin=sinv.date_fin.substring(5,7)+'-'+sinv.date_fin.substring(2,4)
								}
								wr.find('.vehicule-date').text(debut +' / '+fin); 
							}  
						}
						}); 
					}else{
					wr.find('.vehicule-generation-name').text('');  	
					}
					this.filter_items(); 
					this.make_version();
				}, 
			},
			parent: this.wrapper.find('.vehicule-generation-field'),
			render_input: true
		});
	}
	
	make_version(){
		const me = this;
		
		 var val = this.wrapper.find('.vehicule-version-field');
		if(val) val.empty();
		var filter_v = this.vehicule_generation_field.get_value();
		var filter = {}
		if(filter_v) filter = {"generation_vehicule": filter_v}
		 const wr = this.wrapper;
		wr.find('.vehicule-version-name').text('');  
		this.vehicule_version_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Version',
				options: 'Version vehicule',
				default: this.vehicule_version,
				filters: filter,
				onchange: () => {
					//this.last_query['vehicule_version'] = this.vehicule_version;
					this.vehicule_version = this.vehicule_version_field.get_value();
					if (this.vehicule_version) {
						
						frappe.call({
						"method": "frappe.client.get",
						"args": {
							"doctype": "Version vehicule",
							"name": this.vehicule_version
						},
						"callback": function(response) {
							var sinv = response.message; 
							if (sinv) {
								//console.log(sinv);
								wr.find('.vehicule-version-name').text(sinv.commercial_name+" "+sinv.code_moteur+" "+sinv.puissance_fiscale);  
								wr.find('.vehicule-generation-name').text(sinv.nom_generation);  
								wr.find('.vehicule-modele-name').text(sinv.nom_modele);  
								wr.find('.vehicule-marque-name').text(sinv.marque_vehicule);  
								wr.find('.vehicule-image').attr("src",sinv.image);  
								wr.find('.vehicule-date').text(sinv.periode); 

							}  
						}
						}); 
					}else{
					wr.find('.vehicule-version-name').text('');  	
					}
					this.filter_items();
				}, 
			},
			parent: this.wrapper.find('.vehicule-version-field'),
			render_input: true
		});
	}
	
	make_fields() {
		// Search field
		const me = this;
		
		 this.make_marque(); 
		this.make_modele();
		this.make_generation();
		this.make_version();
		  this.make_item_modele();
		this.make_oem();
		
		this.search_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Data',
				label: __('Search Item (Ctrl + i)'),
				placeholder: __('Search by item code, serial number, batch no or barcode')
			},
			parent: this.wrapper.find('.search-field'),
			render_input: true,
		});

		frappe.ui.keys.on('ctrl+i', () => {
			this.search_field.set_focus();
		});

		this.search_field.$input.on('input', (e) => {
			//this.last_query['search_term'] = this.search_term;
			clearTimeout(this.last_search);
			this.last_search = setTimeout(() => {
				const search_term = e.target.value;
				//this.search_term =search_term;
				this.filter_items({ search_term });
			}, 300);
		});
		
		

		// item-manufacturer-field
		this.item_manufacturer_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Manufacturer',
				options: 'Manufacturer',
				//default: me.parent_item_group,
				onchange: () => {
					//this.last_query['item_manufacturer'] = this.item_manufacturer;
					this.item_manufacturer = this.item_manufacturer_field.get_value();
					this.filter_items();
					 
				},
				 
			},
			parent: this.wrapper.find('.item-manufacturer-field'),
			render_input: true
		});
		
		this.item_group_parent_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Famille Article',
				options: 'Item Group',
				default: me.parent_item_group,
				filters: {"is_group":1},
				onchange: () => {
					//this.last_query['item_group'] = this.item_group;
					this.item_group_parent = this.item_group_parent_field.get_value();
					 if(this.item_group_parent)
					 {
						 this.item_modele = '';
						 this.item_group = '';
						 this.make_item_modele();
					 }
						 
					this.filter_items();
				}
			},
			parent: this.wrapper.find('.item-group-parent-field'),
			render_input: true
		});
		
		this.item_group_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				label: 'Item Group',
				options: 'Item Group',
				default: me.parent_item_group,
				onchange: () => {
					//this.last_query['item_group'] = this.item_group;
					this.item_group = this.item_group_field.get_value();
					 if(this.item_group)
					 {
						 this.item_modele = '';
						 this.make_item_modele();
					 }
						 
					this.filter_items();
				},
				get_query: () => {
					return {
						query: 'erpnext.selling.page.point_of_sale.point_of_sale.item_group_query',
						filters: {
							pos_profile: this.frm.doc.pos_profile,
							parent: this.item_group_parent
						}
					};
				}
			},
			parent: this.wrapper.find('.item-group-field'),
			render_input: true
		});
	}

	init_clusterize() {
		this.clusterize = new Clusterize({
			scrollElem: this.wrapper.find('.pos-items-wrapper')[0],
			contentElem: this.wrapper.find('.pos-items')[0],
			rows_in_block: 6
		});
	}

	render_items(items) {
		let _items = items || this.items;

		const all_items = Object.values(_items).map(item => this.get_item_html(item));
		let row_items = [];

		const row_container = '<div class="image-view-row">';
		let curr_row = row_container;

		for (let i=0; i < all_items.length; i++) {
			// wrap 4 items in a div to emulate
			// a row for clusterize
			if(i % 1 === 0 && i !== 0) {
				curr_row += '</div>';
				row_items.push(curr_row);
				curr_row = row_container;
			}
			curr_row += all_items[i];

			if(i == all_items.length - 1) {
				row_items.push(curr_row);
			}
		}

		this.clusterize.update(row_items);
		
	}

	filter_items({start=0, search_term='' }={}) {
		 
		
		 
		if(start==0 || !this.start){
		   this.start = 0;
		   //start=0;
		}
		 
		if(!this.item_group && !this.item_group_parent){
			this.item_group = this.parent_item_group;
		}
		   if (search_term) {
			search_term = search_term.toLowerCase();
		   }
			// memoize
			this.search_index = this.search_index || {};
			//if (this.search_index[search_term]
			//    && this.frm.doc.customer.includes("COMPTOIR")
			//   && !this.item_manufacturer 
			//   && !this.vehicule_marque
			//   && !this.vehicule_modele
			//   && !this.vehicule_generation
			//   && !this.item_modele
			//   && !this.item_oem
			//   && !this.item_group_parent
			///   && !this.vehicule_version) {
			//	const items = this.search_index[search_term];
			//	this.items = items;
			//	this.render_items(items);
			//	this.set_item_in_the_cart(items);
			//	return;
			//	}
			//} else 
				
			if (( this.item_group == this.parent_item_group  || !this.item_group )
			   && this.frm.doc.customer.includes("COMPTOIR")
			   && !this.item_manufacturer 
			   && !this.vehicule_marque
			   && !this.vehicule_modele
			   && !this.item_modele
			   && !this.item_oem
			   && (!search_term || search_term == '')
			   && !this.item_group_parent
			   && !this.vehicule_generation
			   && !this.vehicule_version) {
				//console.log("hoing back");
				return this.render_items([]);
				//this.items = this.all_items;
				//return this.render_items(this.all_items || []);
			}
		 
		//console.log("filter_items2",this.item_manufacturer);
			   
			   
		this.get_items({search_value: search_term,start:start})
			.then(({ items, serial_no, batch_no, barcode }) => {
				//if (search_term && !barcode) {
				//	this.search_index[search_term] = items;
				//}
				if (this.item_modele){
					items.sort(function(a, b){
					  return a.qty > b.qty;
					});
				}
				this.last_last_last_items =this.last_last_items;
				this.last_last_items =this.last_items;
				this.last_items =this.items;
				this.items = items;
				this.render_items(items);
				this.set_item_in_the_cart(items, serial_no, batch_no, barcode);
			});
		loadLazzy();
	}

	set_item_in_the_cart(items, serial_no, batch_no, barcode) {
		if (serial_no) {
			this.events.update_cart(items[0].item_code,
				'serial_no', serial_no);
			this.reset_search_field();
			return;
		}

		if (batch_no) {
			this.events.update_cart(items[0].item_code,
				'batch_no', batch_no);
			this.reset_search_field();
			return;
		}

		if (items.length === 1 && (serial_no || batch_no || barcode)) {
			this.events.update_cart(items[0].item_code,
				'qty', '+1');
			this.reset_search_field();
		}
	}

	reset_search_field() {
		
		if(this.search_field != undefined)
			this.search_field.set_value('');
		
		if(this.vehicule_version_field != undefined)
			this.vehicule_version_field.set_value('');
		if(this.vehicule_generation_field != undefined)
			this.vehicule_generation_field.set_value('');
		if(this.vehicule_modele_field != undefined)
			this.vehicule_modele_field.set_value('');
		if(this.vehicule_marque_field != undefined)
			this.vehicule_marque_field.set_value('');
		if(this.item_modele_field != undefined)
			this.item_modele_field.set_value('');
		if(this.item_group_field != undefined)
			this.item_group_field.set_value('');
		if(this.item_oem_field != undefined)
			this.item_oem_field.set_value('');
		   
		if(this.search_field != undefined)
			this.search_field.$input.trigger("input");
	}

	bind_events() {
		var me = this;
		this.wrapper.on('click', '.btn-open', function(event) {
			//allow_view_item
			if(me.frm.allow_edit_rate){
				 event.stopPropagation();
				const $item = $(this);
				const item_code = unescape($item.attr('data-item-code'));
				window.open('#Form/Item/'+item_code, '_blank', 'toolbar=0,location=0,menubar=0'); 
			}else{
				alert("vous n'êtes pas autorisé");	
			}
			
		});
		
		//btn-pagination
		const wr = this.wrapper;
		this.wrapper.on('click', '.btn-pagination', function(event) {
			if(!me.start){
				me.start = 0;
			}
			 
			me.start = me.start +1;
			//console.log("page ",me.start)
			me.filter_items({start:me.start});
			wr.find('.pagination').text(" "+(me.start || '')+" "); 
			
			 
		});
		//btn-pagination-return
		this.wrapper.on('click', '.btn-pagination-return', function(event) {
			if(!me.start){
				me.start = 0;
			}
			 if(me.start > 0){
				me.start = me.start -1;
			 } 
			me.filter_items({start:me.start});
			wr.find('.pagination').text(" "+(me.start || '')+" "); 
			
			 
		});
		
		//btn-return-item-group
		this.wrapper.on('click', '.btn-return-item-group', function(event) {
			
			me.item_group = '';
			me.item_group_field.set_value('');
			 
		});
		
		//btn-return-item-group-parent
		this.wrapper.on('click', '.btn-return-item-group-parent', function(event) {
			
			me.item_group_parent = '';
			me.item_group_parent_field.set_value('');
			 
		});
		
		//btn-back-result
		this.wrapper.on('click', '.btn-back-result', function(event) {
			me.items = me.last_items;
			me.last_items = me.last_last_items;
			me.last_last_items = me.last_last_last_items;
			me.last_last_last_items = [];
			me.render_items(me.items);
		});
		
		//btn-delete
		this.wrapper.on('click', '.btn-delete', function(event) {
			me.items = [];
			me.vehicule_version_field.set_value('');
			me.vehicule_generation_field.set_value('');
			me.vehicule_modele_field.set_value('');
			me.vehicule_marque_field.set_value('');
			me.item_group_parent = '';
			me.item_group_parent_field.set_value('');
			me.item_group = '';
			me.item_group_field.set_value('');
			me.item_modele = '';
			me.item_modele_field.set_value('');
			//me.item_group_field.set_value(me.last_query.item_group || '');
			me.item_oem = '';
			me.item_oem_field.set_value(''); 
			me.item_manufacturer = '';
			me.item_manufacturer_field.set_value('');
			me.search_field.set_value('');
			me.render_items(me.items);
		});
		
		//btn-vente-perdue
		this.wrapper.on('click', '.btn-vente-perdue', function(event) {
			let value = prompt("Cause de vente perdue?");
			if (value == null || value == "") {
			   return;
			} else {
			  	let article = prompt("Code, Référence ou nom d'article?");
				//Vente Perdue
				frappe.call({
					method: "erpnext.selling.page.point_of_sale.point_of_sale.vente_perdue",
					args: {
						"cause": value,
						"article":article,
						"profile": me.frm.doc.pos_profile
					},
					callback: function(r) { 
						alert("Opération terminée !"); 
					}
				});
				
			}
			
		});
		
		//btn-dosearch
		this.wrapper.on('click', '.btn-dosearch', function(event) {
			var $search_field = me.wrapper.find('.search-field');
			var keyw = $search_field.find('input:text').val();
			me.start = 0;
			me.filter_items({ start:me.start,search_term: keyw});
		});
		
		//btn-remove-pagination
		this.wrapper.on('click', '.btn-remove-pagination', function(event) {
			 
			me.start = 0;
			me.filter_items({start:me.start});
			wr.find('.pagination').text(" "+(me.start || '')+" ");  
		});
		
		
		//btn-return-manufacturer
		this.wrapper.on('click', '.btn-return-manufacturer', function(event) {
			me.item_manufacturer = '';
			me.item_manufacturer_field.set_value('');
			 
		});
		this.wrapper.on('click', '.btn-return-vehicule', function(event) {
			me.vehicule_version_field.set_value('');
			me.vehicule_generation_field.set_value('');
			me.vehicule_modele_field.set_value('');
			me.vehicule_marque_field.set_value('');
		});
		this.wrapper.on('click', '.btn-return-oem', function(event) {
			 
			me.item_modele = '';
			me.item_modele_field.set_value('');
			//me.item_group_field.set_value(me.last_query.item_group || '');
			me.item_oem = '';
			me.item_oem_field.set_value(''); 
			me.filter_items(); 	
		});
		 
		 
		this.wrapper.on('click', '.btn-information', function(event) {
			 event.stopPropagation();
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			erpnext.utils.open_item_info(item_code,me.frm);
			//me.open_item_info(item_code);
				
		});
		
		//btn-demande
		this.wrapper.on('click', '.btn-demande', function(event) {
			 event.stopPropagation();
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			if(!item_code)
			{
				return;
			}
			let qts= prompt("Quantité");
			if (qts == null ){
				return;	
			}
			if ( qts == '') {
			   qts = "+1";
			}
			frappe.call({
				"method": "erpnext.selling.page.point_of_sale.point_of_sale.add_demande",
				"args": {
					"item_code": item_code,
					"qty":qts,
					"profile": me.frm.doc.pos_profile
				},
				"callback": function(response) {
					var items = response.message; 
					if(items){
						 alert(items);
					}
					
				}
			}); 	
		});
		
		
		//btn-complement
		this.wrapper.on('click', '.btn-complement', function(event) {
			
			event.stopPropagation();
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			let pricelist = me.frm.doc.selling_price_list;
			let pos_profile = me.frm.doc.pos_profile;
			if(!item_code)
			{
				return;
			}
			//Composant
			frappe.call({
				"method": "erpnext.selling.page.point_of_sale.point_of_sale.get_complements",
				"args": {
					"item_code": item_code,
					"price_list": pricelist,
					"pos_profile":pos_profile
				},
				"callback": function(response) {
					var items = response.message; 
					if(items){
						me.last_last_last_items =me.last_last_items;
						me.last_last_items =me.last_items;
						me.last_items =me.items; 
						me.items = items;
						me.render_items(items);	
					}
					
				}
			}); 
			
		});
		
		//btn-composant
		this.wrapper.on('click', '.btn-composant', function(event) {
			
			event.stopPropagation();
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			let pricelist = me.frm.doc.selling_price_list;
			let pos_profile = me.frm.doc.pos_profile;
			if(!item_code)
			{
				return;
			}
			//Composant
			frappe.call({
				"method": "erpnext.selling.page.point_of_sale.point_of_sale.get_composants",
				"args": {
					"item_code": item_code,
					"price_list": pricelist,
					"pos_profile":pos_profile
				},
				"callback": function(response) {
					var items = response.message; 
					if(items){
						me.last_last_last_items =me.last_last_items;
						me.last_last_items =me.last_items;
						me.last_items =me.items; 
						me.items = items;
						me.render_items(items);	
					}
					
				}
			}); 
			
			
		});
		
		
		this.wrapper.on('click', '.btn-related', function(event) {
			event.stopPropagation();
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			const modele = item_code.substring(0,11);
			//console.log("modele",modele);
			me.item_modele  = modele;
			me.item_oem = '';
			me.item_oem_field.set_value('');
			//me.vehicule_modele = '';
			//me.vehicule_generation = '';
			//me.vehicule_marque = '';
			//me.vehicule_version = '';
			
			//me.make_marque(); 
			//me.make_modele();
			//me.make_generation();
			//me.make_version();
			me.item_modele_field.set_value(modele);
			me.item_manufacturer_field.set_value(''); 
			me.search_field.set_value('');
			//me.filter_items();
			
		});
		this.wrapper.on('click', '.btn-add', function() {
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			
			
			frappe.call({
				"method": "erpnext.selling.page.point_of_sale.point_of_sale.get_reliquat",
				"args": {
					"customer": me.frm.doc.customer, 
					"item": item_code
				},
				"callback": function(response) {
					var item = response.message; 
					var ok = true
					if (item) {
						if (item > 0){
							ok = false
							frappe.msgprint(
								{
								title: "Qts Reliquat",
								message: "<h1 style='color:red'>Attention Client à commandé déja une quantité : "+item+"</h1>"
							});
							
							frappe.prompt({
								fieldtype:"Data",
								fieldname: "qts",
								label: "Qts",
								reqd: 1,
								description: "Attention Client à commandé déja une quantité : "+item
							},
							function(data) {
								let qts = data.qts								
								if (qts == null ){
									return;	
								}
								if ( qts == '') {
								   qts = "+1";
								}
								me.events.update_cart(item_code, 'qty', qts,1);
							},
							"Qts", "OK"
							);
						}
					}  
					if (ok){
						let qts= prompt("Quantité");
						if (qts == null ){
							return;	
						}
						if ( qts == '') {
						   qts = "+1";
						}
						me.events.update_cart(item_code, 'qty', qts,1);
					}
				}
			}); 
			
		});
		
		this.wrapper.on('click', '.btn-stock', function() {
			const $item = $(this);
			const item_code = unescape($item.attr('data-item-code'));
			var ms = this;
			frappe.call({
					"method": "erpnext.selling.page.point_of_sale.point_of_sale.get_stock_details",
					"args": {
						"item_code": item_code,
						"pos_profile": me.frm.doc.pos_profile
					},
					"callback": function(response) {
						var item = response.message; 
						if (item) {
							// console.log(item);
							
							var html  ='Qts disponible dans le réseau <br>';
							$.each(item[0], function(i, d) {
								
								html+='<hr><label>'+d['warehouse']+'</label>'+' :&nbsp;&nbsp;&nbsp;&nbsp;'+d['actual_qty']+'<br>';
							});
							 
							frappe.msgprint(html,"Qts Stock"
								);
						}  
					}
				}); 
		});
		//btn-manufacturer
		this.wrapper.on('click', '.btn-manufacturer', function() {
			event.stopPropagation();
			const _manufacturer = $(this);
			const manufacturer = _manufacturer.text();
			me.item_manufacturer_field.set_value(manufacturer);
		});
		this.wrapper.on('click', '.oem-text', function() {
			event.stopPropagation();
			const $item = $(this);
			const oem = $item.text();
			const item_code = unescape($item.attr('data-item-code'));
			me.item_oem = oem;
			me.item_oem_field.set_value(oem);
			me.item_modele = '';
			me.item_modele_field.set_value('');
			
			//me.search_field.set_value(oem);
			me.search_field.set_value('');
			me.filter_items();
			//clearTimeout(me.last_search);
			//me.last_search = setTimeout(() => {
			//	const search_term = oem;
			//	me.filter_items({ search_term });
			//}, 300);
		});
		
		
	}

	get(item_code) {
		let item = {};
		this.items.map(data => {
			if (data.item_code === item_code) {
				item = data;
			}
		})

		return item
	}

	get_all() {
		return this.items;
	}

	get_item_html(item) {
		let price_list_rate = "";
		//console.log(item);
		//console.log(item.price_not_ready);
		if(item.price_not_ready ==1){
			
			price_list_rate = "Arrivage en cours";
			//console.log(price_list_rate);
		}else{
			price_list_rate = format_currency(item.price_list_rate, this.currency,0);
			//console.log(price_list_rate);
		}
		
		//price_list_rate = format_currency(item.price_list_rate, this.currency,0);
		const { item_code, item_name, image} = item;
		const item_title =  item_name || item_code;
		const critere_text = (item.critere_text || '').split("/").join("<br>");
		const composant_text =  (item.composant_text || '').split("/").join("<br>");
		const articles_text = (item.articles_text || '').split("/").join("<br>");
		const show_qts_btn = this.frm.show_qts_btn;
		
		const oem = item.oem_text.slice(0, item.oem_text.indexOf('-'));
		let designation_commerciale = '';
		if(item.designation_commerciale){
			designation_commerciale = '<br>'+item.designation_commerciale+	 '<br>';
		}
		let price = '';
		let tooltip = "La quantité réelle / réservée est "+ item.actual_qty+ " / "+item.reserved_qty;
		 if(item.actual_qty ){
			item.actual_qty = item.actual_qty  - item.reserved_qty;
		 	if(item.actual_qty < 0 ){
				item.actual_qty = 0;
		 	}
		 }
		
		 if(item.qts_depot ){
			item.qts_depot = item.qts_depot  - item.reserved_qty;
		 	if(item.qts_depot < 0 ){
				item.qts_depot = 0;
		 	}
		 }
		if(item.qts_total ){
			item.qts_total = item.qts_total  - item.reserved_qty;
			if(item.qts_total < 0 ){
				item.qts_total = 0;
		 	}
		 }
		
		let actual_qty = '0';
		if(parseFloat(item.actual_qty) > 0 || parseFloat(item.qts_total) > 0 || parseFloat(item.qts_depot) > 0){
			price = '<span class="price-info" style="margin:0px;background-color: rgba(10, 154, 7, 0.8);border-radius: 0px;font-weight: bold;">' +price_list_rate +'</span>';
		}
		
		if(show_qts_btn || ((item.actual_qty || 0) == 0 && item.qts_total && (item.qts_total || 0) != (item.actual_qty || 0))){
			actual_qty = '<span title="' + tooltip +'" class="strong" style="color:#02AF22">Qts: '+(item.actual_qty || 0)+ ' / ' +(item.qts_depot || 0) + '  / '+(item.qts_total || 0)+' </span>   <button data-item-code="'+item.item_code+'" data-label="stock" class="btn btn-default btn-xs btn-stock" style="margin-right: 5px;"><i class="fa fa-cubes"></i></button>';
		}else{			
			actual_qty = '<span  title="' + tooltip +'" class="strong" style="color:#02AF22">Qts: '+(item.actual_qty || 0)+ ' </span>  ';
				
		}
		let variantes = '';
		if(item.nbr_variante){
		   variantes = '<span style="font-weight:800">['+(item.nbr_variante || '')+']</span>'
		   }
		let critere = '';
		if(critere_text){
			critere = '<hr style="margin:5px 0px 5px 0px"><span style="font-size:13px;color:red">'+critere_text +'</span>';
		 
		}
		let complements = '';
		
			   let coml = '';
			   if(articles_text)
			   {
				   coml = '<span><strong>Compléments :</strong> <br>'+articles_text +'</span><br>';
			   }
			   
			   let comp = '';
			   if(composant_text)
			   {
				   comp = '<span><strong>Composants :</strong> <br>'+ composant_text +'</span><br>';
			   }
		   if(coml || comp)
		   {   
		   	   complements = '<hr><div>'+coml+comp+'</div>';
		   }
		 
		//image-view-item
		const template = `
			<div class="pos-item-wrapper " data-item-code="${escape(item_code)}" style="width:100%;display:flex;flex-direction: inherit;">
			<div style="width:150px">
					<a class="btn-add" data-item-code="${item_code}"
						title="${item_title}"
					>
						<div class="image-field"
							style="${!image ? 'background-color: #fafbfc;' : ''} border: 0px ;padding:5px"
						>
							${!image ? `<span class="placeholder-text">
									${frappe.get_abbr(item_title)}
								</span>` : '' }
							${image ? `<img class="lazyload" data-src="${image}" alt="${item_title}">` : '' }
						</div>
						${price}
					</a>
			</div>	
			<div style="flex-grow:1;padding:5px;display:flex" >
					<div  style="flex-grow:1" >
						<a class="grey list-id" data-name="${item_code}" title="${item_title}" >
							<span style="font-size:19px;color:blue;font-weight:600"> ${item.manufacturer_part_no} </span><br>${item_title}
						</a>
						${designation_commerciale}
	 					${critere}
						${complements}
						 
					</div>
					 
					<div style="width:200px;padding-left:5px" >
						<div style="margin-bottom:10px"><img  class="lazyload" data-src="${item.fabricant_logo ||'#'}" width="80px" ></div>
						<div>
							<a class="btn-manufacturer" data-name="${item.manufacturer ||''}">${item.manufacturer ||''}</a>
						</div>
						<div>
							${actual_qty}
						</div>
						 
						 <div>${item.adresse ||''}</div>
						 
						<div>
							<a class="btn-related" data-item-code="${item_code}">${item_code} </a> ${variantes}
						</div>
						 
						OEM: <span style="font-weight:800"><a data-item-code="${item_code}" class="oem-text">${oem}</a></span>
						<br>
						 
						<button data-item-code="${item_code}" data-label="composant" class="btn btn-default btn-xs btn-composant" style="margin-right: 5px;">CPS
						</button>
						<button data-item-code="${item_code}" data-label="complement" class="btn btn-default btn-xs btn-complement" style="margin-right: 5px;">CPL
						</button>
						<button data-item-code="${item_code}" data-label="information"   onclick="erpnext.utils.open_item_info('${item_code}', this)"
						class="btn btn-default btn-xs  " style="margin-right: 5px;"><i class="fa fa-question"></i>
						</button>
						<button data-item-code="${item_code}" data-label="add" class="btn btn-success btn-xs btn-add" style="margin-right: 5px;"><i class="fa fa-shopping-cart"></i></button>
						<button data-item-code="${item_code}" data-label="demande" class="btn btn-default btn-xs btn-demande" style="margin-right: 5px;"><i class="fa fa-cube"></i></button>
					</div>
				</div>
				
			</div>
		`;

		return template;
	}
		
	get_items({start = 0, page_length = 40, search_value=''}={}) {
		const price_list = this.frm.doc.selling_price_list;
		if(!this.item_group && !this.item_group_parent){
		this.item_group = this.parent_item_group;	
		}
		
		// console.log("item_group",this.item_group);
		if(start){
			start = start * page_length;	
		}
		let item_group = this.item_group ;
		//console.log(item_group +" "+search_value +" "+this.item_manufacturer  +" "+this.vehicule_marque   +" "+  this.vehicule_modele+" "+ this.item_oem +" "+ this.item_modele +" "+this.vehicule_generation +" "+this.vehicule_version+" "+ this.item_group_parent);
		if(!search_value && !this.item_manufacturer && !this.vehicule_marque && !this.vehicule_modele
		   && !this.item_oem && !this.item_modele && !this.vehicule_generation && !this.vehicule_version )
			
		{
			//console.log("ops nothing to search for");
			return new Promise(res => {
				return [];
			});
		}
		
		if(!search_value || search_value == ''){
		
				return new Promise(res => {
					frappe.call({
						method: "erpnext.selling.page.point_of_sale.point_of_sale.get_items",
						freeze: true,
						args: {
							start,
							page_length,
							price_list,
							item_group,
							search_value,
							pos_profile: this.frm.doc.pos_profile,
							item_manufacturer:this.item_manufacturer ,
							vehicule_marque:this.vehicule_marque, 
							vehicule_modele:this.vehicule_modele, 
							item_oem: this.item_oem,
							item_modele:this.item_modele,
							vehicule_generation:this.vehicule_generation, 
							vehicule_version:this.vehicule_version,
							parent_item_group: this.item_group_parent
						}
					}).then(r => {
						// const { items, serial_no, batch_no } = r.message;

						// this.serial_no = serial_no || "";
						res(r.message);
						   $("img.lazyload").lazyload({ 
							effect: "fadeIn" 
						    }).removeClass("lazy");
					});
				});
			
			}else{
				item_group = null;
				return new Promise(res => {
					frappe.call({
						method: "erpnext.selling.page.point_of_sale.point_of_sale.get_items",
						freeze: true,
						args: {
							start,
							page_length,
							price_list,
							item_group,
							search_value,
							pos_profile: this.frm.doc.pos_profile,
							//item_manufacturer:this.item_manufacturer ,
							//vehicule_marque:this.vehicule_marque, 
							//vehicule_modele:this.vehicule_modele, 
							//item_oem: this.item_oem,
							//item_modele:this.item_modele,
							//vehicule_generation:this.vehicule_generation, 
							//vehicule_version:this.vehicule_version,
							//parent_item_group: this.item_group_parent
						}
					}).then(r => {
						// const { items, serial_no, batch_no } = r.message;

						// this.serial_no = serial_no || "";
						res(r.message);
						   $("img.lazyload").lazyload({ 
							effect: "fadeIn" 
						    }).removeClass("lazy");
					});
				});
				
			}
	}
}

class NumberPad {
	constructor({
		wrapper, onclick, button_array,
		add_class={}, disable_highlight=[],
		reset_btns=[], del_btn='', disable_btns
	}) {
		this.wrapper = wrapper;
		this.onclick = onclick;
		this.button_array = button_array;
		this.add_class = add_class;
		this.disable_highlight = disable_highlight;
		this.reset_btns = reset_btns;
		this.del_btn = del_btn;
		this.disable_btns = disable_btns || [];		 
		this.make_dom();		 
		this.bind_events();
		this.value = '';
	}

	make_dom() {
		if (!this.button_array) {
			this.button_array = [
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9],
				['', 0, '']
			];
		}

		this.wrapper.html(`
			<div class="number-pad">
				${this.button_array.map(get_row).join("")}
			</div>
		`);

		function get_row(row) {
			return '<div class="num-row">' + row.map(get_col).join("") + '</div>';
		}

		function get_col(col) {
			return `<div class="num-col" data-value="${col}"><div>${col}</div></div>`;
		}

		this.set_class();
		//console.log(this.disable_btns);
		//console.log("make_dom");
		if(this.disable_btns) {
			this.disable_btns.forEach((btn) => {
				const $btn = this.get_btn(btn);
				 
				$btn.prop("disabled", true)
				$btn.hover(() => {
					$btn.css('cursor','not-allowed');
				})
			})
		}
	}

	enable_buttons(btns) {
		btns.forEach((btn) => {
			const $btn = this.get_btn(btn);
			 
			$btn.prop("disabled", false)
			$btn.hover(() => {
				$btn.css('cursor','pointer');
			})
		})
	}

	set_class() {
		for (const btn in this.add_class) {
			const class_name = this.add_class[btn];
			this.get_btn(btn).addClass(class_name);
		}
	}

	bind_events() {
		// bind click event
		const me = this;
		this.wrapper.on('click', '.num-col', function() {
			const $btn = $(this);
			const btn_value = $btn.attr('data-value');
			if (!me.disable_highlight.includes(btn_value)) {
				me.highlight_button($btn);
			}
			if (me.reset_btns.includes(btn_value)) {
				me.reset_value();
			} else {
				if (btn_value === me.del_btn) {
					me.value = me.value.substr(0, me.value.length - 1);
				} else {
					me.value += btn_value;
				}
			}
			me.onclick(btn_value);
		});
	}

	reset_value() {
		this.value = '';
	}

	get_value() {
		return flt(this.value);
	}

	get_btn(btn_value) {
		return this.wrapper.find(`.num-col[data-value="${btn_value}"]`);
	}

	highlight_button($btn) {
		$btn.addClass('highlight');
		setTimeout(() => $btn.removeClass('highlight'), 1000);
	}

	set_active(btn_value) {
		const $btn = this.get_btn(btn_value);
		this.wrapper.find('.num-col').removeClass('active');
		$btn.addClass('active');
	}

	set_inactive() {
		this.wrapper.find('.num-col').removeClass('active');
	}
}

class Payment {
	constructor({frm, events}) {
		this.frm = frm;
		this.events = events;
		this.make();
		this.bind_events();
		this.set_primary_action();
	}

	open_modal() {
		this.dialog.show();
	}

	make() {
		this.set_flag();
		this.dialog = new frappe.ui.Dialog({
			fields: this.get_fields(),
			width: 800,
			invoice_frm: this.frm
		});

		this.set_title();

		this.$body = this.dialog.body;

		this.numpad = new NumberPad({
			wrapper: $(this.$body).find('[data-fieldname="numpad"]'),
			button_array: [
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9],
				[__('Del'), 0, '.'],
			],
			onclick: () => {
				if(this.fieldname) {
					this.dialog.set_value(this.fieldname, this.numpad.get_value());
				}
			}
		});
	}

	set_title() {
		let title = __('Total Amount {0}',
			[format_currency(this.frm.doc.rounded_total || this.frm.doc.grand_total,
			this.frm.doc.currency,0)]);

		this.dialog.set_title(title);
	}

	bind_events() {
		var me = this;
		$(this.dialog.body).find('.input-with-feedback').focusin(function() {
			me.numpad.reset_value();
			me.fieldname = $(this).prop('dataset').fieldname;
			if (me.frm.doc.outstanding_amount > 0 &&
				!in_list(['write_off_amount', 'change_amount'], me.fieldname)) {
				me.frm.doc.payments.forEach((data) => {
					if (data.mode_of_payment == me.fieldname && !data.amount) {
						me.dialog.set_value(me.fieldname,
							me.frm.doc.outstanding_amount / me.frm.doc.conversion_rate);
						return;
					}
				})
			}
		});
	}

	set_primary_action() {
		var me = this;

		this.dialog.set_primary_action(__("Submit"), function() {
			me.dialog.hide();
			me.events.submit_form();
		});
	}

	get_fields() {
		const me = this;

		let fields = this.frm.doc.payments.map(p => {
			return {
				fieldtype: 'Currency',
				label: __(p.mode_of_payment),
				options: me.frm.doc.currency,
				fieldname: p.mode_of_payment,
				default: p.amount,
				onchange: () => {
					const value = this.dialog.get_value(this.fieldname) || 0;
					me.update_payment_value(this.fieldname, value);
				}
			};
		});

		fields = fields.concat([
			{
				fieldtype: 'Column Break',
			},
			{
				fieldtype: 'HTML',
				fieldname: 'numpad'
			},
			{
				fieldtype: 'Section Break',
				depends_on: 'eval: this.invoice_frm.doc.loyalty_program'
			},
			{
				fieldtype: 'Check',
				label: 'Redeem Loyalty Points',
				fieldname: 'redeem_loyalty_points',
				onchange: () => {
					me.update_cur_frm_value("redeem_loyalty_points", () => {
						frappe.flags.redeem_loyalty_points = false;
						me.update_loyalty_points();
					});
				}
			},
			{
				fieldtype: 'Column Break',
			},
			{
				fieldtype: 'Int',
				fieldname: "loyalty_points",
				label: __("Loyalty Points"),
				depends_on: "redeem_loyalty_points",
				onchange: () => {
					me.update_cur_frm_value("loyalty_points", () => {
						frappe.flags.loyalty_points = false;
						me.update_loyalty_points();
					});
				}
			},
			{
				fieldtype: 'Currency',
				label: __("Loyalty Amount"),
				fieldname: "loyalty_amount",
				options: me.frm.doc.currency,
				read_only: 1,
				depends_on: "redeem_loyalty_points"
			},
			{
				fieldtype: 'Section Break',
			},
			{
				fieldtype: 'Currency',
				label: __("Write off Amount"),
				options: me.frm.doc.currency,
				fieldname: "write_off_amount",
				default: me.frm.doc.write_off_amount,
				onchange: () => {
					me.update_cur_frm_value('write_off_amount', () => {
						frappe.flags.change_amount = false;
						me.update_change_amount();
					});
				}
			},
			{
				fieldtype: 'Column Break',
			},
			{
				fieldtype: 'Currency',
				label: __("Change Amount"),
				options: me.frm.doc.currency,
				fieldname: "change_amount",
				default: me.frm.doc.change_amount,
				onchange: () => {
					me.update_cur_frm_value('change_amount', () => {
						frappe.flags.write_off_amount = false;
						me.update_write_off_amount();
					});
				}
			},
			{
				fieldtype: 'Section Break',
			},
			{
				fieldtype: 'Currency',
				label: __("Paid Amount"),
				options: me.frm.doc.currency,
				fieldname: "paid_amount",
				default: me.frm.doc.paid_amount,
				read_only: 1
			},
			{
				fieldtype: 'Column Break',
			},
			{
				fieldtype: 'Currency',
				label: __("Outstanding Amount"),
				options: me.frm.doc.currency,
				fieldname: "outstanding_amount",
				default: me.frm.doc.outstanding_amount,
				read_only: 1
			},
		]);

		return fields;
	}

	set_flag() {
		frappe.flags.write_off_amount = true;
		frappe.flags.change_amount = true;
		frappe.flags.loyalty_points = true;
		frappe.flags.redeem_loyalty_points = true;
		frappe.flags.payment_method = true;
	}

	update_cur_frm_value(fieldname, callback) {
		if (frappe.flags[fieldname]) {
			const value = this.dialog.get_value(fieldname);
			this.frm.set_value(fieldname, value)
				.then(() => {
					callback();
				});
		}

		frappe.flags[fieldname] = true;
	}

	update_payment_value(fieldname, value) {
		var me = this;
			$.each(this.frm.doc.payments, function(i, data) {
				if (__(data.mode_of_payment) == __(fieldname)) {
					frappe.model.set_value('Sales Invoice Payment', data.name, 'amount', value)
						.then(() => {
							me.update_change_amount();
							me.update_write_off_amount();
						});
				}
			});
	}

	update_change_amount() {
		this.dialog.set_value("change_amount", this.frm.doc.change_amount);
		this.show_paid_amount();
	}

	update_write_off_amount() {
		this.dialog.set_value("write_off_amount", this.frm.doc.write_off_amount);
	}

	show_paid_amount() {
		this.dialog.set_value("paid_amount", this.frm.doc.paid_amount);
		this.dialog.set_value("outstanding_amount", this.frm.doc.outstanding_amount);
	}

	update_payment_amount() {
		var me = this;
		$.each(this.frm.doc.payments, function(i, data) {
			//console.log("setting the ", data.mode_of_payment, " for the value", data.amount);
			me.dialog.set_value(data.mode_of_payment, data.amount);
		});
	}

	update_loyalty_points() {
		if (this.dialog.get_value("redeem_loyalty_points")) {
			this.dialog.set_value("loyalty_points", this.frm.doc.loyalty_points);
			this.dialog.set_value("loyalty_amount", this.frm.doc.loyalty_amount);
			this.update_payment_amount();
			this.show_paid_amount();
		}
	}

}

lazyload();

function loadLazzy() {
	console.log("lazy");
	 $("img.lazyload").lazyload({ 
		effect: "fadeIn" 
	    }).removeClass("lazy");
}


 


	

