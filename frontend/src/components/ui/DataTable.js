export default function DataTable({ columns, rows, empty = 'No records' }) {
  return (
    <div className="table-wrapper glass" style={{ borderRadius: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 12, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>{empty}</td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.id || row._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '12px 14px', fontSize: 13 }}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
