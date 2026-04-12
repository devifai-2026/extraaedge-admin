import React, { useState } from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import "./FailedLeads.css";

const initialLeads = [
  {
    id: 1,
    firstName: "Unknown",
    email: "",
    mobile: "9366903781",
    referredTo: "Divya Nair",
    createdOn: "Mar 31, 2026 10:46 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 2,
    firstName: "Juned mulla",
    email: "faridmulla655@gmail.com",
    mobile: "9699285131",
    referredTo: "Divya Nair",
    createdOn: "Jan 5, 2026 1:23 PM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 3,
    firstName: "Akash Bokefod",
    email: "bokefodakash@gmail.com",
    mobile: "8308416342",
    referredTo: "Divya Nair",
    createdOn: "Jan 5, 2026 1:23 PM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 4,
    firstName: "Balaji Bhaskar Ingle",
    email: "ingalebalaji76@gmail.com",
    mobile: "7770096497",
    referredTo: "Divya Nair",
    createdOn: "Dec 29, 2025 10:30 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 5,
    firstName: "Kanha Bhoi",
    email: "test@gmail.com",
    mobile: "8274877346",
    referredTo: "Divya Nair",
    createdOn: "Dec 24, 2025 10:33 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 6,
    firstName: "Qauser",
    email: "test@gmail.com",
    mobile: "9149417764",
    referredTo: "Divya Nair",
    createdOn: "Dec 24, 2025 10:33 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 7,
    firstName: "Yash Ramesh Shinde",
    email: "test@gmail.com",
    mobile: "7773982894",
    referredTo: "Divya Nair",
    createdOn: "Dec 24, 2025 10:33 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 8,
    firstName: "Rohit Kumar",
    email: "rohit.k@gmail.com",
    mobile: "9988776655",
    referredTo: "Divya Nair",
    createdOn: "Dec 20, 2025 9:15 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 9,
    firstName: "Sneha Patil",
    email: "sneha.p@gmail.com",
    mobile: "8877665544",
    referredTo: "Divya Nair",
    createdOn: "Dec 18, 2025 3:45 PM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 10,
    firstName: "Amit Sharma",
    email: "amit.sharma@gmail.com",
    mobile: "9012345678",
    referredTo: "Divya Nair",
    createdOn: "Dec 15, 2025 11:00 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 11,
    firstName: "Priya Desai",
    email: "priya.desai@gmail.com",
    mobile: "8901234567",
    referredTo: "Divya Nair",
    createdOn: "Dec 12, 2025 2:30 PM",
    errorMessage: "Lead data already exists in the sheet",
  },
  {
    id: 12,
    firstName: "Rahul Verma",
    email: "rahul.v@gmail.com",
    mobile: "7890123456",
    referredTo: "Divya Nair",
    createdOn: "Dec 10, 2025 9:00 AM",
    errorMessage: "Lead data already exists in the sheet",
  },
];

const PAGE_SIZE = 10;

function FailedLeads() {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const totalPages = Math.ceil(leads.length / PAGE_SIZE);
  const paginatedLeads = leads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleFieldChange = (id, field, value) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, [field]: value } : lead))
    );
  };

  const handleCheckbox = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pageIds = paginatedLeads.map((l) => l.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleAdd = (id) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      alert(`Adding lead: ${lead.firstName} (${lead.email}, ${lead.mobile})`);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    setLeads((prev) => prev.filter((l) => l.id !== deleteId));
    setSelectedIds((prev) => prev.filter((sid) => sid !== deleteId));
    setDeleteId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteId(null);
  };

  return (
    <div className="failed-leads-container">
      <span className="failed-leads-title">Failed Lead List</span>
      <hr className="failed-leads-title-underline" />

      <table className="failed-leads-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                className="failed-leads-checkbox"
                checked={
                  paginatedLeads.length > 0 &&
                  paginatedLeads.every((l) => selectedIds.includes(l.id))
                }
                onChange={handleSelectAll}
              />
            </th>
            <th>First Name</th>
            <th>Email Id</th>
            <th>Mobile</th>
            <th>Refered To</th>
            <th>Created On</th>
            <th>Error Message</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paginatedLeads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <input
                  type="checkbox"
                  className="failed-leads-checkbox"
                  checked={selectedIds.includes(lead.id)}
                  onChange={() => handleCheckbox(lead.id)}
                />
              </td>
              <td>
                <input
                  className="editable-input"
                  type="text"
                  value={lead.firstName}
                  onChange={(e) =>
                    handleFieldChange(lead.id, "firstName", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  className="editable-input"
                  type="email"
                  value={lead.email}
                  onChange={(e) =>
                    handleFieldChange(lead.id, "email", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  className="editable-input"
                  type="tel"
                  value={lead.mobile}
                  onChange={(e) =>
                    handleFieldChange(lead.id, "mobile", e.target.value)
                  }
                />
              </td>
              <td>{lead.referredTo}</td>
              <td>{lead.createdOn}</td>
              <td>
                <span className="failed-leads-error">{lead.errorMessage}</span>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <IconButton
                  size="small"
                  title="Add lead"
                  onClick={() => handleAdd(lead.id)}
                >
                  <AddCircleIcon sx={{ color: "#ff7800" }} />
                </IconButton>
                <IconButton
                  size="small"
                  title="Delete lead"
                  onClick={() => handleDeleteClick(lead.id)}
                >
                  <DeleteIcon sx={{ color: "#ff7800" }} />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="failed-leads-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={currentPage === page ? "active" : ""}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            &gt;
          </button>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this lead? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default FailedLeads;
