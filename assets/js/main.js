// Main JavaScript functionality
document.addEventListener("DOMContentLoaded", () => {
    // Initialize components
    initModals()
    initForms()
    initTables()
  
    // Auto-refresh for real-time updates
    if (window.location.search.includes("page=receptionist") || window.location.search.includes("page=calls")) {
      setInterval(refreshCallStatus, 30000) // Refresh every 30 seconds
    }
  })
  
  // Modal functionality
  function initModals() {
    const modals = document.querySelectorAll(".modal")
    const modalTriggers = document.querySelectorAll("[data-modal]")
    const modalCloses = document.querySelectorAll(".modal-close, [data-modal-close]")
  
    modalTriggers.forEach((trigger) => {
      trigger.addEventListener("click", function (e) {
        e.preventDefault()
        const modalId = this.getAttribute("data-modal")
        const modal = document.getElementById(modalId)
        if (modal) {
          modal.classList.add("active")
        }
      })
    })
  
    modalCloses.forEach((close) => {
      close.addEventListener("click", function () {
        const modal = this.closest(".modal")
        if (modal) {
          modal.classList.remove("active")
        }
      })
    })
  
    // Close modal on backdrop click
    modals.forEach((modal) => {
      modal.addEventListener("click", function (e) {
        if (e.target === this) {
          this.classList.remove("active")
        }
      })
    })
  }
  
  // Form handling
  function initForms() {
    const forms = document.querySelectorAll("form[data-ajax]")
  
    forms.forEach((form) => {
      form.addEventListener("submit", function (e) {
        e.preventDefault()
        submitForm(this)
      })
    })
  }
  
  function submitForm(form) {
    const formData = new FormData(form)
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.textContent
  
    // Show loading state
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...'
  
    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showAlert("success", data.message || "Operation completed successfully")
          if (data.redirect) {
            setTimeout(() => {
              window.location.href = data.redirect
            }, 1000)
          } else if (data.reload) {
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }
        } else {
          showAlert("danger", data.message || "An error occurred")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("danger", "An error occurred while processing your request")
      })
      .finally(() => {
        // Restore button state
        submitBtn.disabled = false
        submitBtn.textContent = originalText
      })
  }
  
  // Table functionality
  function initTables() {
    // Add sorting functionality
    const sortableHeaders = document.querySelectorAll("th[data-sort]")
  
    sortableHeaders.forEach((header) => {
      header.style.cursor = "pointer"
      header.addEventListener("click", function () {
        const column = this.getAttribute("data-sort")
        const table = this.closest("table")
        sortTable(table, column)
      })
    })
  }
  
  function sortTable(table, column) {
    const tbody = table.querySelector("tbody")
    const rows = Array.from(tbody.querySelectorAll("tr"))
    const isNumeric = !isNaN(Number.parseFloat(rows[0].querySelector(`[data-value="${column}"]`)?.textContent))
  
    rows.sort((a, b) => {
      const aVal = a.querySelector(`[data-value="${column}"]`)?.textContent || ""
      const bVal = b.querySelector(`[data-value="${column}"]`)?.textContent || ""
  
      if (isNumeric) {
        return Number.parseFloat(aVal) - Number.parseFloat(bVal)
      } else {
        return aVal.localeCompare(bVal)
      }
    })
  
    rows.forEach((row) => tbody.appendChild(row))
  }
  
  // Alert system
  function showAlert(type, message) {
    const alertContainer = document.getElementById("alert-container") || createAlertContainer()
  
    const alert = document.createElement("div")
    alert.className = `alert alert-${type}`
    alert.innerHTML = `
          <i class="fas fa-${getAlertIcon(type)}"></i>
          <span>${message}</span>
          <button type="button" class="modal-close" onclick="this.parentElement.remove()">
              <i class="fas fa-times"></i>
          </button>
      `
  
    alertContainer.appendChild(alert)
  
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove()
      }
    }, 5000)
  }
  
  function createAlertContainer() {
    const container = document.createElement("div")
    container.id = "alert-container"
    container.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 1050;
          max-width: 400px;
      `
    document.body.appendChild(container)
    return container
  }
  
  function getAlertIcon(type) {
    const icons = {
      success: "check-circle",
      danger: "exclamation-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    }
    return icons[type] || "info-circle"
  }
  
  // Real-time updates
  function refreshCallStatus() {
    fetch("actions/get_call_status.php")
      .then((response) => response.json())
      .then((data) => {
        updateCallStatusDisplay(data)
      })
      .catch((error) => {
        console.error("Error refreshing call status:", error)
      })
  }
  
  function updateCallStatusDisplay(data) {
    // Update active calls count
    const activeCallsElement = document.getElementById("active-calls-count")
    if (activeCallsElement) {
      activeCallsElement.textContent = data.active_calls || 0
    }
  
    // Update call status indicators
    data.calls?.forEach((call) => {
      const statusElement = document.getElementById(`call-status-${call.id}`)
      if (statusElement) {
        statusElement.className = `call-status ${call.status}`
        statusElement.textContent = call.status.charAt(0).toUpperCase() + call.status.slice(1)
      }
    })
  }
  
  // Utility functions
  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }
  
  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  