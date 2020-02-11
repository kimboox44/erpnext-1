# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe, erpnext
from frappe import _, _dict
from erpnext.stock.get_item_details import get_item_details
from frappe.utils import getdate, cstr, flt, fmt_money

def execute(filters=None):
	columns, data = [], []
	if not filters.group and not filters.demande and not filters.consultation_interne and not filters.consultation_externe and not filters.ref_fabricant and not filters.item_code and not filters.generation_v and not filters.marque_v and not filters.variant_of and not filters.modele_v and not filters.version and not filters.price_list and not filters.perfection and not filters.manufacturer:
		frappe.msgprint("Appliquer un filtre")
		return columns, data
	
	if filters.get('manufacturer'):
		manufacturers = cstr(filters.get("manufacturer")).strip()
		filters.manufacturer = [d.strip() for d in manufacturers.split(',') if d]
	if filters.get('manufacturer_lp'):
		manufacturer_lp = cstr(filters.get("manufacturer_lp")).strip()
		filters.manufacturer_lp = [d.strip() for d in manufacturer_lp.split(',') if d]
		
	columns.append({
			"fieldname": "commander",
			"label": "Commander",
			"width": 300
		})
	columns.append({
			"fieldname": "item_code",
			"label": _("Item Code"),
			"width": 150
		})
	columns.append({
			"fieldname": "date_recom",
			"label": "Derniere Date Commande",
			"width": 150
		})
	columns.append({
			"fieldname": "item_name",
			"label": _("Item Name"),
			"width": 150
		})
	columns.append({
			"fieldname": "uom",
			"label": "Unite Mesure",
			"width": 150
		})
	columns.append({
			"fieldname": "fabricant",
			"label": "Fabricant",
			"width": 150
		})
	columns.append({
			"fieldname": "ref_fabricant",
			"label": "Ref Fabricant",
			"width": 150
		})
	columns.append({
			"fieldname": "poids",
			"label": _("Poids"),
			"width": 150
		})
	columns.append({
			"fieldname": "perfection",
			"label": "Perfection",
			"width": 150
		})
	##########
	columns.append({
			"fieldname": "date_material_request",
			"label": "Date Demande",
			"width": 150
		})
	columns.append({
			"fieldname": "material_request",
			"label": _("Material Request"),
			"width": 150
		})
	columns.append({
			"fieldname": "supplier_quotation",
			"label": "Consultation",
			"width": 150
		})
	columns.append({
			"fieldname": "supplier",
			"label": "Fournisseur",
			"width": 150
		})
	columns.append({
			"fieldname": "qts_demande",
			"label": _("Qte Demandee"),
			"width": 150
		})
	columns.append({
			"fieldname": "base_amount",
			"label": "base_amount",
			"width": 150
		})
	columns.append({
			"fieldname": "prix_target",
			"label": "prix_target",
			"width": 150
		})
	columns.append({
			"fieldname": "base_rate",
			"label": "base_rate",
			"width": 150
		})
	columns.append({
			"fieldname": "amount",
			"label": "amount",
			"width": 150
		})
	columns.append({
			"fieldname": "owner",
			"label": "owner",
			"width": 150
		})
	columns.append({
			"fieldname": "devis_status",
			"label": "Etat d'article dans consultation",
			"width": 180
		})
	##########
	columns.append({
			"fieldname": "last_qty",
			"label": "Derniere Qts Achetee",
			"width": 150
		})
	columns.append({
			"fieldname": "last_valuation",
			"label": "Derniere taux de valorisation",
			"width": 150
		})
	columns.append({
			"fieldname": "consom",
			"label": "Consommation 1 ans",
			"width": 150
		})
	columns.append({
			"fieldname": "qts_reliquat",
			"label": "Qte reliquats",
			"width": 160
		})
	columns.append({
			"fieldname": "qts_dem",
			"label": "Qte Demande non commande",
			"width": 160
		})
	columns.append({
			"fieldname": "qts",
			"label": "Qte",
			"width": 150
		})
	columns.append({
			"fieldname": "qts_projete",
			"label": "Qte Projete",
			"width": 150
		})
	columns.append({
			"fieldname": "qts_max_achat",
			"label": "Qte Max d'achat",
			"width": 150
		})
	columns.append({
			"fieldname": "qts_recom",
			"label": "Recommande auto",
			"width": 150
		})
	columns.append({
			"fieldname": "last_purchase_rate",
			"label": "Dernier Prix d'achat (DZD)",
			"width": 150
		})
	columns.append({
			"fieldname": "last_purchase_devise",
			"label": "Dernier Prix d'achat (Devise)",
			"width": 150
		})
	columns.append({
			"fieldname": "qts_devis",
			"label": "Qte Devis",
			"width": 150
		})
	columns.append({
			"fieldname": "offre_fournisseur",
			"label": "Offre fournisseur",
			"width": 150
		})
	columns.append({
			"fieldname": "taux_app",
			"label": "Taux approche %",
			"width": 150
		})
	columns.append({
			"fieldname": "offre_fournisseur_dz",
			"label": "Offre Fournisseur DZD",
			"width": 150
		})
	columns.append({
			"fieldname": "target_price",
			"label": "Prix Target",
			"width": 150
		})
	columns.append({
			"fieldname": "target_price_dz",
			"label": "Prix Target DZD",
			"width": 150
		})
	columns.append({
			"fieldname": "target_qts",
			"label": "Qts Target",
			"width": 150
		})
	columns.append({
			"fieldname": "remarque",
			"label": "Remarque",
			"width": 150
		})
	columns.append({
			"fieldname": "prix_devis",
			"label": "Dernier Offre",
			"width": 150
		})
	columns.append({
			"fieldname": "prix_devis_dz",
			"label": "Dernier Offre DZD",
			"width": 150
		})
	columns.append({
			"fieldname": "set_qts_devis",
			"label": "Qts a commande",
			"width": 150
		})
	columns.append({
			"fieldname": "etat_confirmation",
			"label": "Confirmation",
			"width": 150
		})
	columns.append({
			"fieldname": "confirmation",
			"label": "Confirmation",
			"width": 350
		})
	
	if filters.show_price:
		price_lists= frappe.get_all("Price List",filters={"buying":1},fields=["name","currency"])
		if price_lists:
			for pl in price_lists:
				columns.append({
					"fieldname": pl.name,
					"label": "%s (%s)" % (pl.name,pl.currency),
					"width": 150
				})
	mris = []

	order_by_statement = "order by sqi.item_code"
	#parent material_request_item - material_request - qty - variant_of - creation
	items = frappe.db.sql(
		"""
		select sqi.parent,
		sqi.material_request_item,
		sqi.material_request,
		sqi.qty,
		sqi.creation,
		sqi.rate,
		sqi.base_amount,
		sqi.prix_target,
		sqi.owner,
		sqi.amount,
		sqi.base_rate,
		sqi.name,
		sqi.prix_de_revient,
		sqi.prix_fournisseur,
		sqi.prix_fournisseur_dzd,
		sqi.prix_target,
		sqi.qts_target,
		sqi.remarque,
		sqi.confirmation,
		it.item_code,
		it.item_name,
		it.stock_uom,
		it.weight_per_unit,
		it.item_group,
		it.variant_of,
		it.perfection,
		it.is_purchase_item,
		it.variant_of,
		it.has_variants,
		it.manufacturer,
		it.last_purchase_rate , 
		it.manufacturer_part_no, 
		it.last_purchase_devise,
		it.max_order_qty,
		it.max_ordered_variante
		from `tabSupplier Quotation Item` sqi left join `tabItem` it
		ON sqi.item_code = it.item_code
		where sqi.docstatus=0 {conditions}
		{order_by_statement}
		""".format(
			conditions=get_conditions(filters),
			order_by_statement=order_by_statement
		),
		filters, as_dict=1)
	all_items = []
	item_dc = {}
	models = {item.variant_of for item in items if item.variant_of}
	for model in models:
		_mitems = [item for item in items if item.variant_of == model]
		origin_model = frappe.get_doc("Item",model)
		mitems = [origin_model]
		mitems.extend(_mitems)
		ids = {o.item_code for o in mitems if item.item_code}
		lids = "','".join(ids)
		other_sq =  frappe.db.sql(
		"""
		select sqi.parent,
		sqi.material_request_item,
		sqi.material_request,
		sqi.qty,
		sqi.creation,
		sqi.rate,
		sqi.base_amount,
		sqi.prix_target,
		sqi.owner,
		sqi.amount,
		sqi.base_rate,
		sqi.name,
		sqi.prix_de_revient,
		sqi.prix_fournisseur,
		sqi.prix_fournisseur_dzd,
		sqi.prix_target,
		sqi.qts_target,
		sqi.remarque,
		sqi.confirmation,
		it.item_code,
		it.item_name,
		it.stock_uom,
		it.weight_per_unit,
		it.item_group,
		it.variant_of,
		it.perfection,
		it.is_purchase_item,
		it.variant_of,
		it.has_variants,
		it.manufacturer,
		it.last_purchase_rate , 
		it.manufacturer_part_no, 
		it.last_purchase_devise,
		it.max_order_qty,
		it.max_ordered_variante
		from `tabSupplier Quotation Item` sqi left join `tabItem` it
		ON sqi.item_code = it.item_code
		where sqi.docstatus=0 and it.variant_of = %s and sqi.item_code not in ('{0}')
		""".format(lids),
		(model), as_dict=1)
		mitems.extend(other_sq)
		oids = {o.item_code for o in mitems if item.item_code}
		others = frappe.get_all("Item",filters={"variant_of":model,"item_code":("not in",oids)},fields=[
		"variant_of",
		"stock_uom", 
		"perfection",
		"is_purchase_item",
		"weight_per_unit",
		"variant_of",
		"has_variants",
		"item_name", 
		"item_code", 
		"manufacturer",
		"last_purchase_rate" , 
		"manufacturer_part_no", 
		"item_group",
		"last_purchase_devise",
		"max_order_qty",
		"max_ordered_variante"])
		
		mitems.extend(others)
		
		for mri in mitems:
			global info
			supplier = ''
			qts_demande = 0
			devis_status = ''
			material_request = ''
			supplier_quotation =  ''
			qts_devis = 0
			datedm = ''
			#rate,
			rate= 0
			rate_dzd=0
			#base_amount,
			base_amount = 0
			#prix_target,
			prix_target = 0
			#base_rate,
			base_rate= 0
			#amount,
			amount = 0
			#owner,
			owner=  ''
			prix_fournisseur = 0
			prix_de_revient = 0
			prix_fournisseur_dzd = 0
			prix_target = 0
			prix_target_dzd = 0
			convertion_rate = 1
			qts_target = 0
			remarque = ''
			confirmation = ''
			conf_cmd = ''
			if hasattr(mri, 'material_request'):
				conf_cmd = """<button id='approuver_%s' onClick="approuver('%s')" type='button'>Approuver</button><button id='en_cours_%s' onClick="en_cours('%s')" type='button'>En Cours</button><button id='annuler_%s' onClick="annuler('%s')" type='button'>Annuler</button>""" % (mri.name,mri.name,mri.name,mri.name,mri.name,mri.name)
				supplier = frappe.db.get_value("Supplier Quotation",mri.parent,"supplier_name")
				qts_demande = frappe.db.get_value("Material Request Item",mri.material_request_item,"qty")
				devis_status = frappe.db.get_value("Supplier Quotation",mri.parent,"etat_consultation_deux")
				convertion_rate = frappe.db.get_value("Supplier Quotation",mri.parent,"conversion_rate") or 1
				if not convertion_rate:
					convertion_rate = 1
				material_request = mri.material_request
				supplier_quotation = mri.parent
				qts_devis = mri.qty or 0
				rate = mri.rate or 0
				base_amount = mri.base_amount
				prix_target = mri.prix_target or 0
				base_rate = mri.base_rate
				amount = mri.amount
				owner = mri.owner
				prix_fournisseur = mri.prix_fournisseur or 0
				prix_de_revient = mri.prix_de_revient or 1
				prix_fournisseur_dzd = mri.prix_fournisseur_dzd or 0
				prix_target = mri.prix_target or 0
				qts_target = mri.qts_target or 0
				remarque = mri.remarque
				prix_target_dzd = prix_target * convertion_rate * prix_de_revient * 1.19
				rate_dzd = rate * convertion_rate * prix_de_revient * 1.19
				confirmation = mri.confirmation
				_datedm =frappe.db.get_value("Material Request Item",mri.material_request_item,"creation")
				if _datedm:
					datedm = frappe.utils.get_datetime(_datedm).strftime("%d/%m/%Y")

			qts_max_achat = 0
			if mri.variant_of:
				#variante
				info = info_variante(mri.item_code)
				qts_max_achat = mri.max_ordered_variante
			elif mri.has_variants:
				info = info_modele(mri.item_code)
				qts_max_achat = mri.max_order_qty
			sqllast_qty = frappe.db.sql("""select actual_qty,valuation_rate from `tabStock Ledger Entry` 
			where item_code=%s and voucher_type=%s 
			order by posting_date, posting_time limit 1""", (mri.item_code,"Purchase Receipt"), as_dict=1)
			last_qty = 0
			last_valuation = 0
			recom = 0
			_date = ""
			date =""
			date = frappe.utils.get_datetime(mri.creation).strftime("%d/%m/%Y")
			_recom = frappe.get_all("Item Reorder",fields=["warehouse_reorder_qty","modified"],filters=[{"parent":mri.item_code},{"warehouse":"GLOBAL - MV"}])
			if _recom:
				recom = _recom[0].warehouse_reorder_qty
				_date = _recom[0].modified
				#date = frappe.utils.get_datetime(date).strftime("%d/%m/%Y")
			if sqllast_qty:
				last_qty = sqllast_qty[0].actual_qty
				last_valuation = sqllast_qty[0].valuation_rate

			row = ["""<button id='%s' onClick="demander_item('%s')" type='button'>Changer</button><input placeholder='Qts devis' id='input_%s' style='color:black'></input><button   onClick="achat_item('%s')" type='button'> X </button>""" % (mri.name,mri.name,mri.name,mri.name),
			       mri.item_code,
			       #date
			       date,
			       mri.item_name,
			       #uom
			       mri.stock_uom,
			       mri.manufacturer,
			       mri.manufacturer_part_no,
			       #poids
			       mri.weight_per_unit,
			       #perfection
			       mri.perfection,
			       #datedm
			       datedm,
			       #material_request
			       material_request,
			       #supplier_quotation
			       supplier_quotation,
			       #supplier
			       supplier,
			       #qts_demande
			       qts_demande,
			       
			       #base_amount,
			       base_amount,
			       #prix_target,
			       """<input placeholder='Prix target' id='prix_target_%s' value='%s' style='color:black'>%s</input><button  onClick="prix_target_item('%s')" type='button'> OK </button>""" % (mri.name,prix_target,prix_target,mri.name),
			       #base_rate,
			       base_rate,
			       #amount,
			       amount,
			       #owner,
			       owner,
			       #devis_status
			       devis_status,
			       #last_qty
			       last_qty,
			       #last_valuation
			       last_valuation or 0,
			       #consom,
			       "_",
			       #qts_reliquat
			       info[3] or 0,
			       #qts_dem
			       info[1] or 0,
			       #qts
			       info[0] or 0,
			       #qts_projete
			       info[2] or 0,
			       #qts_max_achat
			       qts_max_achat or 0,
			       #recom
			       recom,
			       #last_purchase_rate
			       mri.last_purchase_rate  or 0,
			       #last_purchase_devise
			       mri.last_purchase_devise  or 0,
			       #qts_devis
			       qts_devis,
			       #prix_fournisseur
			       prix_fournisseur,
			       #prix_de_revient
			       prix_de_revient,
			       #prix_fournisseur_dzd
			       prix_fournisseur_dzd,
			       #prix_target
			       prix_target,
			       #prix_target_dzd
			       prix_target_dzd,
			       #qts_target
			       qts_target,
			       #remarque
			       remarque,
			       #prix_devis
			       rate,
			       #rate_dzd,
			       rate_dzd,
			       #qts_devis
			       qts_devis,
			       #confirmation
			       confirmation,
			       #cmd
			       conf_cmd
			      ]

			if filters.show_price:
			# get prices in each price list
				if price_lists and not mri.has_variants:
					for pl in price_lists:
						if pl.name:
							price = frappe.db.sql("""select price_list_rate from `tabItem Price` where buying=1 and price_list=%s and (  item_code=%s) ORDER BY creation DESC LIMIT 1;""",(pl.name,mri.item_code))
							if price:
								row.append(price[0][0])
							else:
								row.append("_")
						else:
							row.append("_")

			data.append(row)
		
	return columns, data
					       
def get_conditions(filters):
	conditions = []
	# group, modele, manufacturer, age_plus, age_minus
	if filters.get('group'):
		conditions.append("it.item_group=%(group)s")
	
	#consultation_externe
	if filters.get('demande'):
		conditions.append("""sqi.material_request=%(demande)s""")

	#consultation_externe
	if filters.get('from_date'):
		conditions.append("""sqi.creation >= %(from_date)s""")
	#consultation_interne
	if filters.get('consultation_interne'):
		conditions.append("""sqi.parent=%(consultation_interne)s""")
	#consultation_externe
	if filters.get('consultation_externe'):
		conditions.append("""sqi.parent=%(consultation_externe)s""")
	
	#perfection
	if filters.get('perfection'):
		conditions.append("it.perfection=%(perfection)s")
	if filters.get('variant_of'):
		conditions.append("(it.item_code=%(variant_of)s or it.variant_of=%(variant_of)s)")
	if filters.get('is_purchase'):	
		conditions.append("it.is_purchase_item=1")
	if filters.get('version'):
		conditions.append("""(it.item_code in (select parent from `tabVersion vehicule item` vv
		where vv.version_vehicule=%(version)s))"""  )
	if filters.get('modele_v'):
		modele = frappe.db.get_value("Modele de vehicule", filters.modele_v, "modele")
		#frappe.get_doc('Modele de vehicule',filters.modele_vehicule)
		if modele:
			query = """(it.item_code in (select parent from `tabVersion vehicule item` vm
		where vm.modele_vehicule='%s'))""" % modele
			conditions.append(query)

	if filters.get('marque_v'):
		conditions.append("""(it.item_code in (select parent from `tabVersion vehicule item` vr 
		where vr.marque_vehicule=%(marque_v)s))""")

	if filters.get('generation_v'):
		#generation_vehicule
		generation = frappe.db.get_value("Generation vehicule", filters.generation_v, "generation")
		if generation:
			conditions.append("""(it.item_code in (select parent from `tabVersion vehicule item` vsr 
		where vsr.generation_vehicule='%s'))""" % generation)

	if filters.get('price_list'):
		manufacturer_lp = filters.manufacturer_lp
		req = ")"
		if filters.get('manufacturer_lp'):
			req = " and vpr.fabricant in  %(manufacturer_lp)s )"
		conditions.append(""" (it.item_code in (select item_code from `tabItem Price` vpr 
		where vpr.price_list=%(price_list)s"""+  (req)+""" or it.variant_of in (select item_model from `tabItem Price` vpr 
		where vpr.price_list=%(price_list)s """+  (req)+""")""")

	#if filters.get('modele'):
	#	conditions.append("(variant_of=%(modele)s or item_code=%(modele)s)")
	
	if filters.get('manufacturer'):
		conditions.append("it.manufacturer in %(manufacturer)s")
	
	if filters.get('ref_fabricant'):
		conditions.append("(it.manufacturer_part_no LIKE  '%%{0}%%' or it.clean_manufacturer_part_number LIKE  '%%{0}%%')".format(filters.ref_fabricant))
	
	if filters.get('item_code'):
		conditions.append("it.item_code LIKE '%%{0}%%'".format(filters.item_code))
		#conditions.append("(manufacturer=%(manufacturer)s)")
		
	return "and {}".format(" and ".join(conditions)) if conditions else ""

def info_modele(model, warehouse=None):
	values, condition = [model], ""
	if warehouse:
		values.append(warehouse)
		condition += " AND warehouse = %s"

	actual_qty = frappe.db.sql("""select sum(actual_qty), sum(indented_qty), sum(projected_qty), sum(ordered_qty) from tabBin
		where model=%s {0}""".format(condition), values)[0]

	return actual_qty

def info_variante(model, warehouse=None):
	values, condition = [model], ""
	if warehouse:
		values.append(warehouse)
		condition += " AND warehouse = %s"

	actual_qty = frappe.db.sql("""select sum(actual_qty), sum(indented_qty), sum(projected_qty), sum(ordered_qty) from tabBin
		where item_code=%s {0}""".format(condition), values)[0]

	return actual_qty
