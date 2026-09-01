const entityDocuments = {
  Individual: {
    requiredDocuments: [
      { key: "pan_signing_authority", name: "PAN Card (Signing Authority)", required: true },
      { key: "address_proof", name: "Address Proof (Signing Authority)", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  "Sole Proprietorship": {
    requiredDocuments: [
      { key: "pan_signing_authority", name: "PAN Card (Signing Authority)", required: true },
      { key: "address_proof", name: "Address Proof (Signing Authority)", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true },
      { key: "government_proof_1", name: "Government Proof 1", required: true },
      { key: "government_proof_2", name: "Government Proof 2", required: true }
    ]
  },

  Partnership: {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "authorization_letter", name: "Authorization / Board Resolution Letter", required: true },
      { key: "partnership_deed", name: "Partnership Deed", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  LLP: {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "authorization_letter", name: "Authorization / Board Resolution Letter", required: true },
      { key: "llp_deed", name: "LLP Deed", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  "Private Limited": {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "authorization_letter", name: "Authorization / Board Resolution Letter", required: true },
      { key: "certificate_of_incorporation", name: "Certificate of Incorporation", required: true },
      { key: "moa", name: "Memorandum of Association (MOA)", required: true },
      { key: "aoa", name: "Articles of Association (AOA)", required: true },
      { key: "shareholding_pattern", name: "Shareholding Pattern", required: true }
    ]
  },

  "Public Limited": {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "authorization_letter", name: "Authorization / Board Resolution Letter", required: true },
      { key: "certificate_of_incorporation", name: "Certificate of Incorporation", required: true },
      { key: "moa", name: "Memorandum of Association (MOA)", required: true },
      { key: "aoa", name: "Articles of Association (AOA)", required: true },
      { key: "shareholding_pattern", name: "Shareholding Pattern", required: true }
    ]
  },

  Trust: {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "trust_deed", name: "Trust Deed", required: true },
      { key: "beneficiary_list", name: "Beneficiary / Trustee List", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  Society: {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "bye_laws", name: "Bye Laws / MOA", required: true },
      { key: "member_list", name: "Member List (Registrar Certified)", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  Government: {
    requiredDocuments: [
      { key: "government_certificate", name: "Government Certificate / Authorization", required: true }
    ]
  },

  OPC: {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "certificate_of_incorporation", name: "Certificate of Incorporation", required: true },
      { key: "moa", name: "Memorandum of Association (MOA)", required: true },
      { key: "aoa", name: "Articles of Association (AOA)", required: true }
    ]
  },

  HUF: {
    requiredDocuments: [
      { key: "pan_entity", name: "HUF PAN", required: true },
      { key: "huf_declaration", name: "POA / HUF Declaration", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  AJP: {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "registration_proof", name: "Evidence of Registration", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  },

  "Local Authority": {
    requiredDocuments: [
      { key: "pan_entity", name: "PAN Card (Entity)", required: true },
      { key: "registration_proof", name: "Evidence of Registration", required: true },
      { key: "bank_account_proof", name: "Bank Account Proof", required: true }
    ]
  }
};

module.exports = entityDocuments;