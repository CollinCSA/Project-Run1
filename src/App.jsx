
import React, { useState } from 'react';
import { structureData } from './structureData';
import { pricingData } from './pricingData';
import { legendConfig } from './legendConfig';

const App = () => {
  const [selections, setSelections] = useState(Array(legendConfig.fields.length).fill(""));
  const [structureCount, setStructureCount] = useState(1);

  const handleSelectChange = (index, value) => {
    const newSelections = [...selections];
    newSelections[index] = value;
    setSelections(newSelections);
  };

  const determineStructureType = () => {
    const matchType = Object.entries(legendConfig.valid_combinations).find(([type, values]) =>
      values.every((val, i) => {
        const current = selections[i];
        return val === current || val === "N/A" || current === "N/A";
      })
    );
    return matchType ? matchType[0] : null;
  };

  const getMaterials = (structureType) => {
    return structureData
      .map(row => {
        try {
          const qty = row[structureType];
          if (!qty || qty.toString().trim() === "") return null;

          const qtyStr = qty.toString().trim();
          const isFeet = qtyStr.endsWith("'");
          const numericQty = parseFloat(qtyStr.replace("'", ""));
          const displayQty = isFeet
            ? (numericQty * structureCount) + " ft"
            : (numericQty * structureCount) + " pcs";

          const pricing = pricingData.find(p => p.Part === row.Part);
          if (!pricing) return {
            part: row.Part,
            quantityDisplay: displayQty,
            unitPrice: null,
            total: null,
            vendor: "N/A"
          };

          let minPrice = Infinity;
          let selectedVendor = null;
          for (const [vendorRaw, priceRaw] of Object.entries(pricing)) {
            const vendor = vendorRaw.trim();
            if (vendor === "Part") continue;
            const cleaned = typeof priceRaw === "string" ? priceRaw.trim() : priceRaw;
            const p = parseFloat(cleaned);
            if (!isNaN(p) && p < minPrice) {
              minPrice = p;
              selectedVendor = vendor;
            }
          }

          if (!selectedVendor) return {
            part: row.Part,
            quantityDisplay: displayQty,
            unitPrice: null,
            total: null,
            vendor: "N/A"
          };

          const total = !isNaN(numericQty) ? numericQty * minPrice * structureCount : null;

          return {
            part: row.Part,
            quantityDisplay: displayQty,
            unitPrice: minPrice,
            total: total,
            vendor: selectedVendor
          };
        } catch (err) {
          console.error('Error processing row:', row, err);
          return null;
        }
      })
      .filter(Boolean);
  };

  const matchedStructure = determineStructureType();
  const materials = matchedStructure ? getMaterials(matchedStructure) : [];
  const totalCost = materials.reduce((sum, m) => sum + (m.total || 0), 0);

  return (
    <div>
      <header>
        <h1>CSA Material Takeoff</h1>
        <img src="csa_logo.png" alt="CSA Logo" />
      </header>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <label><strong>Number of Structures:</strong></label>
          <input
            type="number"
            min="1"
            value={structureCount}
            onChange={e => setStructureCount(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ marginLeft: '1rem', padding: '0.5rem', width: '80px' }}
          />
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {legendConfig.fields.map(([label, options], i) => (
            <div key={i}>
              <label>{label}: </label>
              <select
                value={selections[i]}
                onChange={e => handleSelectChange(i, e.target.value)}
              >
                <option value="">-- Select --</option>
                {options.map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {matchedStructure ? (
          <>
            <h2>Matched Structure: {matchedStructure}</h2>
            <table border="1" cellPadding="10">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Vendor</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat, idx) => (
                  <tr key={idx}>
                    <td>{mat.part}</td>
                    <td>{mat.quantityDisplay}</td>
                    <td>{mat.unitPrice ? `$${mat.unitPrice.toFixed(2)}` : 'N/A'}</td>
                    <td>{mat.vendor}</td>
                    <td>{mat.total ? `$${mat.total.toFixed(2)}` : 'N/A'}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="4"><strong>Total</strong></td>
                  <td><strong>${totalCost.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ marginTop: '2rem', color: 'darkred' }}><strong>Missing Data: No structure matches current selection</strong></p>
        )}
      </div>
    </div>
  );
};

export default App;
