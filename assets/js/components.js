// Component-specific JavaScript

// Call timer
class CallTimer {
    constructor(callId, startTime) {
      this.callId = callId
      this.startTime = new Date(startTime)
      this.timerElement = document.getElementById(`timer-${callId}`)
      this.interval = null
      this.start()
    }
  
    start() {
      this.interval = setInterval(() => {
        const now = new Date()
        const duration = Math.floor((now - this.startTime) / 1000)
        if (this.timerElement) {
          this.timerElement.textContent = this.formatDuration(duration)
        }
      }, 1000)
    }
  
    stop() {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    }
  
    formatDuration(seconds) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
  }
  
  // Auto-complete for caller search
  class CallerSearch {
    constructor(inputElement) {
      this.input = inputElement
      this.resultsContainer = this.createResultsContainer()
      this.debounceTimer = null
      this.init()
    }
  
    init() {
      this.input.addEventListener("input", (e) => {
        clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
          this.search(e.target.value)
        }, 300)
      })
  
      this.input.addEventListener("blur", () => {
        setTimeout(() => {
          this.hideResults()
        }, 200)
      })
    }
  
    createResultsContainer() {
      const container = document.createElement("div")
      container.className = "search-results"
      container.style.cssText = `
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background: white;
              border: 1px solid var(--border-color);
              border-top: none;
              border-radius: 0 0 0.375rem 0.375rem;
              box-shadow: var(--shadow);
              max-height: 200px;
              overflow-y: auto;
              z-index: 1000;
              display: none;
          `
  
      this.input.parentElement.style.position = "relative"
      this.input.parentElement.appendChild(container)
      return container
    }
  
    search(query) {
      if (query.length < 2) {
        this.hideResults()
        return
      }
  
      fetch(`actions/search_callers.php?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => {
          this.displayResults(data)
        })
        .catch((error) => {
          console.error("Search error:", error)
        })
    }
  
    displayResults(results) {
      if (results.length === 0) {
        this.hideResults()
        return
      }
  
      this.resultsContainer.innerHTML = results
        .map(
          (caller) => `
              <div class="search-result-item" data-caller='${JSON.stringify(caller)}' style="
                  padding: 0.75rem;
                  border-bottom: 1px solid var(--border-color);
                  cursor: pointer;
                  transition: background-color 0.2s;
              " onmouseover="this.style.backgroundColor='var(--background-color)'" 
                 onmouseout="this.style.backgroundColor='transparent'">
                  <div style="font-weight: 500;">${caller.name}</div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary);">${caller.phone}</div>
                  ${caller.company ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${caller.company}</div>` : ""}
              </div>
          `,
        )
        .join("")
  
      // Add click handlers
      this.resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
        item.addEventListener("click", () => {
          const caller = JSON.parse(item.getAttribute("data-caller"))
          this.selectCaller(caller)
        })
      })
  
      this.showResults()
    }
  
    selectCaller(caller) {
      // Fill form fields
      document.getElementById("caller_name").value = caller.name
      document.getElementById("caller_phone").value = caller.phone
      if (document.getElementById("caller_company")) {
        document.getElementById("caller_company").value = caller.company || ""
      }
  
      this.hideResults()
  
      // Trigger custom event
      this.input.dispatchEvent(
        new CustomEvent("callerSelected", {
          detail: caller,
        }),
      )
    }
  
    showResults() {
      this.resultsContainer.style.display = "block"
    }
  
    hideResults() {
      this.resultsContainer.style.display = "none"
    }
  }
  
  // Initialize components when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    // Initialize caller search
    const callerSearchInput = document.getElementById("caller_search")
    if (callerSearchInput) {
      new CallerSearch(callerSearchInput)
    }
  
    // Initialize call timers
    document.querySelectorAll("[data-call-timer]").forEach((element) => {
      const callId = element.getAttribute("data-call-id")
      const startTime = element.getAttribute("data-start-time")
      new CallTimer(callId, startTime)
    })
  })
  