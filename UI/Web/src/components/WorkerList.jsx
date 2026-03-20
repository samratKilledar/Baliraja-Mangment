import { useEffect, useState } from 'react';
import api from '../api/client';

export default function WorkerList() {
  const [workers, setWorkers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get('/workers');
      setWorkers(data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load workers');
    }
  }

  return (
    <div className="table-wrap">
      {error && <p className="error">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Contract</th>
            <th>Paid / Remaining</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w._id}>
              <td>{w.userId?.fullName}</td>
              <td>{w.userId?.phone}</td>
              <td>{w.contractStart?.slice(0,10)} to {w.contractEnd?.slice(0,10)}</td>
              <td>{w.paidAmount || 0} / {w.remainingAmount ?? (w.totalContractAmount - (w.paidAmount||0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
