document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const roleInputs = document.querySelectorAll("input[name='role']");
  const studentEmailGroup = document.getElementById("student-email-group");
  const dashboardEmailInput = document.getElementById("dashboard-email");
  const loadDashboardBtn = document.getElementById("load-dashboard");
  const studentDashboard = document.getElementById("student-dashboard");
  const adminDashboard = document.getElementById("admin-dashboard");
  const studentProfile = document.getElementById("student-profile");
  const adminStudentList = document.getElementById("admin-student-list");

  function setMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function showSection(section) {
    studentDashboard.classList.add("hidden");
    adminDashboard.classList.add("hidden");

    if (section === "student") {
      studentDashboard.classList.remove("hidden");
    } else if (section === "admin") {
      adminDashboard.classList.remove("hidden");
    }
  }

  function updateRoleUI() {
    const selectedRole = document.querySelector("input[name='role']:checked").value;
    studentEmailGroup.classList.toggle("hidden", selectedRole !== "student");
    if (selectedRole === "student") {
      showSection("student");
    } else {
      showSection("admin");
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();
      if (response.ok) {
        setMessage(result.message, "success");
        await fetchActivities();
        const selectedRole = document.querySelector("input[name='role']:checked").value;
        if (selectedRole === "student") {
          const emailValue = dashboardEmailInput.value.trim();
          if (emailValue) {
            await fetchStudentProfile(emailValue);
          }
        } else if (selectedRole === "admin") {
          await fetchAdminDashboard();
        }
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function fetchStudentProfile(email) {
    if (!email) {
      studentProfile.innerHTML =
        "<p>Please provide a student email to load the profile.</p>";
      return;
    }

    try {
      const response = await fetch(
        `/students/${encodeURIComponent(email)}`
      );
      const profile = await response.json();

      renderStudentProfile(profile);
    } catch (error) {
      studentProfile.innerHTML =
        "<p>Unable to load student profile at this time.</p>";
      console.error("Error fetching student profile:", error);
    }
  }

  function renderStudentProfile(profile) {
    const activitiesMarkup = profile.activities.length
      ? `<ul>${profile.activities
          .map((activity) => `<li>${activity}</li>`)
          .join("")}</ul>`
      : "<p><em>No activities signed up yet.</em></p>";

    studentProfile.innerHTML = `
      <div class="activity-card">
        <p><strong>Email:</strong> ${profile.email}</p>
        <p><strong>Signed Up Activities:</strong></p>
        ${activitiesMarkup}
      </div>
    `;
  }

  async function fetchAdminDashboard() {
    try {
      const response = await fetch("/admin/students");
      const data = await response.json();
      renderAdminStudentList(data.students);
    } catch (error) {
      adminStudentList.innerHTML =
        "<p>Unable to load admin dashboard at this time.</p>";
      console.error("Error fetching admin dashboard:", error);
    }
  }

  function renderAdminStudentList(students) {
    if (!students.length) {
      adminStudentList.innerHTML =
        "<p><em>No student profiles available yet.</em></p>";
      return;
    }

    adminStudentList.innerHTML = students
      .map(
        (student) => `
        <div class="activity-card">
          <p><strong>Email:</strong> ${student.email}</p>
          <p><strong>Signed Up:</strong></p>
          <ul>
            ${student.activities
              .map((activity) => `<li>${activity}</li>`)
              .join("")}
          </ul>
        </div>
      `
      )
      .join("");
  }

  function loadDashboard() {
    const selectedRole = document.querySelector("input[name='role']:checked").value;
    if (selectedRole === "student") {
      showSection("student");
      fetchStudentProfile(dashboardEmailInput.value.trim());
    } else {
      showSection("admin");
      fetchAdminDashboard();
    }
  }

  roleInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateRoleUI();
    });
  });

  loadDashboardBtn.addEventListener("click", (event) => {
    event.preventDefault();
    loadDashboard();
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  fetchActivities();
  updateRoleUI();
});
