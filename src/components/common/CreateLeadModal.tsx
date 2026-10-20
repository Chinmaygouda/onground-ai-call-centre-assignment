import React, { useState } from 'react';
import { UserPlus, X, Check } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import styles from './CreateLeadModal.module.css';

export const CreateLeadModal: React.FC = () => {
  const { isCreateLeadModalOpen, setIsCreateLeadModalOpen, addNewLead, openLeadsModal } =
    useAppState();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [product, setProduct] = useState('Ortho GRID Mattress');
  const [price, setPrice] = useState('24990');
  const [slaLeft, setSlaLeft] = useState('2h left');
  const [notes, setNotes] = useState('');
  const [financingSignal, setFinancingSignal] = useState('Inquired about 0% EMI options on King size');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isCreateLeadModalOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Customer name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone === '+91') {
      newErrors.phone = 'Customer phone number is required';
    } else if (cleanPhone.length < 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      newErrors.price = 'Enter a valid product quotation price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const initials = name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'LD';

    addNewLead({
      name: name.trim(),
      initials,
      product,
      price: Number(price),
      attractivenessScore: 92,
      icpScore: 88,
      intentScore: 90,
      slaLeft,
      status: 'OPEN',
      quoteTag: 'Quote generated',
      signals: {
        financing: financingSignal || 'No financing objection recorded',
        quotation: 'Requested official quote with discount breakdown',
        warranty: 'Proactively explained 100-night trial and 10-year warranty'
      },
      phone: phone.trim(),
      notes: notes.trim() || 'Logged via frontline agent quick-lead creation.'
    });

    setIsCreateLeadModalOpen(false);
    // Open the new lead (index 0)
    openLeadsModal(0);
  };

  return (
    <div className={styles.backdrop} onClick={() => setIsCreateLeadModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <UserPlus size={18} color="#047857" />
            <h3 className={styles.title}>Create New Lead</h3>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => setIsCreateLeadModalOpen(false)}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Customer Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Customer Full Name <span className={styles.req}>*</span>
            </label>
            <input
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              placeholder="e.g. Vikram Sharma"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          {/* Phone Number */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Phone Number <span className={styles.req}>*</span>
            </label>
            <input
              type="text"
              className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>

          {/* Product & Quoted Price Row */}
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Product of Interest</label>
              <select
                className={styles.select}
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                <option value="SmartGRID Ortho Mattress">SmartGRID Ortho Mattress</option>
                <option value="SmartGRID Luxe Mattress">SmartGRID Luxe Mattress</option>
                <option value="Elevate Adjustable Bed">Elevate Adjustable Bed</option>
                <option value="Ergonomic Recliner Bed">Ergonomic Recliner Bed</option>
                <option value="Smart Ergonomic Pillow Bundle">Smart Ergonomic Pillow Bundle</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Quoted Price (₹) <span className={styles.req}>*</span>
              </label>
              <input
                type="number"
                className={`${styles.input} ${errors.price ? styles.inputError : ''}`}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
                }}
              />
              {errors.price && <span className={styles.errorText}>{errors.price}</span>}
            </div>
          </div>

          {/* SLA Window */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Initial SLA Window</label>
            <select
              className={styles.select}
              value={slaLeft}
              onChange={(e) => setSlaLeft(e.target.value)}
            >
              <option value="2h left">Urgent (2h left)</option>
              <option value="4h left">Today (4h left)</option>
              <option value="Tomorrow Morning">Tomorrow Morning</option>
              <option value="Weekend Callback">Weekend Callback</option>
            </select>
          </div>

          {/* Buying Signals */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Financing & Buying Signal Note</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Wants 0% EMI over 6 months on HDFC credit card"
              value={financingSignal}
              onChange={(e) => setFinancingSignal(e.target.value)}
            />
          </div>

          {/* Additional Notes */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>In-Store / Call Notes</label>
            <textarea
              className={styles.textarea}
              rows={2}
              placeholder="Any specific customer requirements, room measurements, or trial questions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setIsCreateLeadModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <Check size={16} />
              <span>Create & Open Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
