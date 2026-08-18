// ============================================================
// DESIGN AND CRAFT MART
// PARTNER HUB - COMPLETE APP.JS
// ============================================================


// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;
let currentProfile = null;

let allContentIdeas = [];
let currentContentFilter = "all";


// ============================================================
// AUTHENTICATION / APP INITIALIZATION
// ============================================================

(async function init() {

    try {

        // ----------------------------------------------------
        // Make sure Supabase exists
        // ----------------------------------------------------

        if (typeof supabaseClient === "undefined") {

            console.error("supabaseClient is not defined.");

            window.location.href = "index.html";

            return;
        }


        // ----------------------------------------------------
        // Get current session
        // ----------------------------------------------------

        const {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(
                "Session error:",
                sessionError
            );

            window.location.href = "index.html";

            return;
        }


        const session = sessionData?.session;


        // ----------------------------------------------------
        // No logged-in user
        // ----------------------------------------------------

        if (!session) {

            window.location.href = "index.html";

            return;
        }


        currentUser = session.user;


        // ----------------------------------------------------
        // Load user profile
        // ----------------------------------------------------

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("user_profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();


        if (profileError) {

            console.error(
                "Profile loading error:",
                profileError
            );

            await supabaseClient.auth.signOut();

            window.location.href = "index.html";

            return;
        }


        if (!profile) {

            await supabaseClient.auth.signOut();

            window.location.href = "index.html";

            return;
        }


        // ----------------------------------------------------
        // Check approval
        // ----------------------------------------------------

        if (profile.status !== "approved") {

            await supabaseClient.auth.signOut();

            window.location.href = "index.html";

            return;
        }


        currentProfile = profile;

        updateUserInterface();
        renderBusinessCard(currentProfile);

        // ----------------------------------------------------
        // Setup user information
        // ----------------------------------------------------

        // Helper: build a safe CSS background-image value from a URL.
        // Validates that the URL uses http/https and escapes double quotes/newlines.
        function buildSafeBackgroundImage(url) {
            try {
                if (!url) return "";
                // Ensure URL constructor parses it (absolute or relative)
                const u = new URL(url, window.location.origin);
                if (u.protocol !== "http:" && u.protocol !== "https:") return "";
                // Escape double quotes and newlines to avoid breaking CSS
                const safe = u.toString().replace(/\"/g, '%22').replace(/\n/g, '');
                return 'url("' + safe + '")';
            } catch (e) {
                return "";
            }
        }

        updateUserInterface();




        // ----------------------------------------------------
        // Admin controls
        // ----------------------------------------------------

        if (currentProfile.role === "admin") {

            const adminNav =
                document.getElementById("adminNavItem");

            if (adminNav) {
                adminNav.style.display = "flex";
            }

            const mobileAdminNav =
                document.getElementById("mobileAdminNavItem");

            if (mobileAdminNav) {
                mobileAdminNav.style.display = "flex";
            }

            await loadJoinRequests();

            await loadPendingContent();

        }


        // ----------------------------------------------------
        // Load application data
        // ----------------------------------------------------

        await loadDashboard();

        await loadContent();

        await loadCustomers();

        await loadOrders();

        await loadNotifications();

        setupRealtime();

        await initializeTeamChat();

        console.log(
            "Partner Hub initialized successfully."
        );

    }

    catch (error) {

        console.error(
            "Application initialization error:",
            error
        );

    }

})();


// ============================================================
// USER INTERFACE
// ============================================================

function updateUserInterface() {

    if (!currentProfile || !currentUser) {
        return;
    }


    const fullName =
        currentProfile.full_name ||
        "Partner";


    const firstName =
        fullName.split(" ")[0] ||
        "Partner";

    const roleOrPosition =
        currentProfile.position ||
        currentProfile.job_title ||
        currentProfile.role ||
        "Partner";

    const phone =
        currentProfile.mobile ||
        "";

    const email =
        currentUser.email ||
        "";

    const website =
        currentProfile.website ||
        currentProfile.website_url ||
        currentProfile.web_url ||
        currentProfile.fb_profile ||
        "";


    // --------------------------------------------------------
    // Sidebar user
    // --------------------------------------------------------

    const whoAmI =
        document.getElementById("whoAmI");

    if (whoAmI) {

        whoAmI.textContent =
            `${fullName} (${currentProfile.role || "partner"})`;

    }


    const userRole =
        document.getElementById("userRole");

    if (userRole) {

        userRole.textContent =
            currentProfile.role ||
            "Partner";

    }


    // --------------------------------------------------------
    // Dashboard name
    // --------------------------------------------------------

    const dashboardName =
        document.getElementById("dashboardName");

    if (dashboardName) {

        dashboardName.textContent =
            firstName;

    }


    // --------------------------------------------------------
    // Profile
    // --------------------------------------------------------

    const profileName =
        document.getElementById("profileName");

    if (profileName) {

        profileName.textContent =
            fullName;

    }


    const profilePosition =
        document.getElementById("profilePosition");

    if (profilePosition) {
        profilePosition.textContent = roleOrPosition;
    }


    const profileEmail =
        document.getElementById("profileEmail");

    if (profileEmail) {

        profileEmail.textContent =
            currentUser.email ||
            "—";

    }


    const profilePhone =
        document.getElementById("profilePhone");

    if (profilePhone) {

        profilePhone.textContent =
            currentProfile.mobile ||
            "—";

    }


    // --------------------------------------------------------
    // Business card
    // --------------------------------------------------------

    const cardName = document.getElementById("cardPersonName");
    if (cardName) {
        cardName.textContent = fullName;
    }

    const cardRole = document.getElementById("cardPersonRole");
    if (cardRole) {
        cardRole.textContent = roleOrPosition;
    }

    const cardPhone = document.getElementById("cardPhone");
    const cardPhoneRow = document.getElementById("cardPhoneRow");
    if (cardPhone) {
        cardPhone.textContent = phone || "";
    }
    if (cardPhoneRow) {
        cardPhoneRow.classList.toggle("is-hidden", !phone);
    }

    const cardEmail = document.getElementById("cardEmail");
    const cardEmailRow = document.getElementById("cardEmailRow");
    if (cardEmail) {
        cardEmail.textContent = email || "";
    }
    if (cardEmailRow) {
        cardEmailRow.classList.toggle("is-hidden", !email);
    }

    const cardWebsite = document.getElementById("cardWebsite");
    const cardWebsiteRow = document.getElementById("cardWebsiteRow");
    if (cardWebsite) {
        cardWebsite.textContent = website || "";
    }
    if (cardWebsiteRow) {
        cardWebsiteRow.classList.toggle("is-hidden", !website);
    }


    // --------------------------------------------------------
    // Avatar
    // --------------------------------------------------------

    const initial =
        fullName
            .charAt(0)
            .toUpperCase() ||
        "A";


    const avatarUrlGlobal = currentProfile.avatar_url || currentProfile.avatar || null;

    [
        "userAvatar",
        "topAvatar",
        "profileAvatar"
    ].forEach((id) => {

        const element = document.getElementById(id);

        if (!element) return;

        if (avatarUrlGlobal) {
            element.classList.add('has-image');
            element.style.backgroundImage = buildSafeBackgroundImage(avatarUrlGlobal);
            element.textContent = '';
        } else {
            element.classList.remove('has-image');
            element.style.backgroundImage = '';
            element.textContent = initial;
        }

    });

}


// Small toast helper (elegant, non-blocking notifications)
function showToast(message, type = 'info') {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = message;
        container.appendChild(toast);
        // trigger CSS animation
        requestAnimationFrame(() => toast.classList.add('visible'));
        // remove after timeout
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => { try { container.removeChild(toast); } catch (e) { } }, 300);
        }, 3500);
    } catch (e) {
        console.warn('Toast error', e);
    }
}


    // ============================================================
// PROFILE SECTION
// ============================================================

// ------------------------------------------------------------
// PROFILE ELEMENTS
// ------------------------------------------------------------

const profileEditModal =
    document.getElementById("profileEditModal");

const profileEditForm =
    document.getElementById("profileEditForm");


// ------------------------------------------------------------
// UPDATE PROFILE UI
// ------------------------------------------------------------

function updateProfileUI() {

    if (!currentUser || !currentProfile) {
        return;
    }

    const fullName =
        currentProfile.full_name ||
        "Partner";

    const position = currentProfile.position || currentProfile.job_title || "Not added";

    const phone =
        currentProfile.mobile ||
        "Not added";

    const email =
        currentUser.email ||
        "Not added";

    const address =
        currentProfile.address ||
        "Not added";

    const facebook =
        currentProfile.fb_profile ||
        "";

    const initial =
        fullName
            .charAt(0)
            .toUpperCase() ||
        "A";


    // --------------------------------------------------------
    // Main Profile
    // --------------------------------------------------------

    const profileName =
        document.getElementById("profileName");

    if (profileName) {
        profileName.textContent =
            fullName;
    }


    const profilePosition =
        document.getElementById("profilePosition");

    if (profilePosition) {
        profilePosition.textContent =
            position;
    }


    const profileEmail =
        document.getElementById("profileEmail");

    if (profileEmail) {
        profileEmail.textContent =
            email;
    }


    const profilePhone =
        document.getElementById("profilePhone");

    if (profilePhone) {
        profilePhone.textContent =
            phone;
    }


    const profileAddress =
        document.getElementById("profileAddress");

    if (profileAddress) {
        profileAddress.textContent =
            address;
    }


    // --------------------------------------------------------
    // Facebook
    // --------------------------------------------------------

    const profileFacebook =
        document.getElementById("profileFacebook");

    if (profileFacebook) {

        if (facebook) {

            profileFacebook.href =
                facebook;

            profileFacebook.textContent =
                "View Profile";

            profileFacebook.style.pointerEvents =
                "auto";

            profileFacebook.style.opacity =
                "1";

        } else {

            profileFacebook.removeAttribute(
                "href"
            );

            profileFacebook.textContent =
                "Not added";

            profileFacebook.style.pointerEvents =
                "none";

            profileFacebook.style.opacity =
                "0.5";

        }

    }


    // --------------------------------------------------------
    // Profile Avatar (supports image preview via currentProfile.avatar_url)
    // --------------------------------------------------------

    const profileAvatar = document.getElementById("profileAvatar");

    const avatarUrl =
        (currentProfile && (currentProfile.avatar_url || currentProfile.avatar)) || null;

    if (profileAvatar) {
        if (avatarUrl) {
            profileAvatar.classList.add('has-image');
            profileAvatar.style.backgroundImage = buildSafeBackgroundImage(avatarUrl);
            profileAvatar.textContent = '';
        } else {
            profileAvatar.classList.remove('has-image');
            profileAvatar.style.backgroundImage = '';
            profileAvatar.textContent = initial;
        }
    }


    // --------------------------------------------------------
    // BUSINESS CARD
    // --------------------------------------------------------

    const businessCardName =
        document.getElementById(
            "businessCardName"
        );

    if (businessCardName) {

        businessCardName.textContent =
            fullName;

    }


    const businessCardPosition =
        document.getElementById(
            "businessCardPosition"
        );

    if (businessCardPosition) {

        businessCardPosition.textContent =
            position;

    }


    const businessCardPhone =
        document.getElementById(
            "businessCardPhone"
        );

    if (businessCardPhone) {

        businessCardPhone.textContent =
            phone;

    }


    const businessCardEmail =
        document.getElementById(
            "businessCardEmail"
        );

    if (businessCardEmail) {

        businessCardEmail.textContent =
            email;

    }




    const businessCardFacebook =
        document.getElementById(
            "businessCardFacebook"
        );

    if (businessCardFacebook) {
        if (facebook) {
            try {
                const u = new URL(facebook, window.location.origin);
                // extract readable username or last part of path
                let display = u.pathname.replace(/\/+$/,'').split('/').pop() || u.hostname;
                if (!display || display === '/') display = facebook;
                businessCardFacebook.href = facebook;
                businessCardFacebook.textContent = display;
                businessCardFacebook.style.pointerEvents = 'auto';
                businessCardFacebook.style.opacity = '1';
            } catch (e) {
                businessCardFacebook.href = facebook;
                businessCardFacebook.textContent = facebook;
                businessCardFacebook.style.pointerEvents = 'auto';
                businessCardFacebook.style.opacity = '1';
            }
        } else {
            businessCardFacebook.removeAttribute('href');
            businessCardFacebook.textContent = 'Not added';
            businessCardFacebook.style.pointerEvents = 'none';
            businessCardFacebook.style.opacity = '0.6';
        }
    }

}


// ------------------------------------------------------------
// OPEN PROFILE EDIT MODAL
// ------------------------------------------------------------

function openProfileEditModal() {

    if (!profileEditModal) {
        return;
    }

    if (!currentProfile) {
        return;
    }


    document.getElementById(
        "editProfileName"
    ).value =
        currentProfile.full_name ||
        "";


    const editRoleEl = document.getElementById("editProfileRole");
    if (editRoleEl) {
        editRoleEl.value = currentProfile.role || "partner";
    }

    const editPositionEl = document.getElementById("editProfilePosition");
    if (editPositionEl) {
        editPositionEl.value = currentProfile.position || currentProfile.job_title || "";
    }

    const editEmailEl = document.getElementById("editProfileEmail");
    if (editEmailEl) {
        editEmailEl.value = currentUser.email || "";
    }


    document.getElementById(
        "editProfilePhone"
    ).value =
        currentProfile.mobile ||
        "";


    document.getElementById(
        "editProfileAddress"
    ).value =
        currentProfile.address ||
        "";


    document.getElementById(
        "editProfileFacebook"
    ).value =
        currentProfile.fb_profile ||
        "";


    profileEditModal.style.display =
        "flex";

    document.body.style.overflow =
        "hidden";

}


// ------------------------------------------------------------
// CLOSE PROFILE EDIT MODAL
// ------------------------------------------------------------

function closeProfileEditModal() {

    if (!profileEditModal) {
        return;
    }

    profileEditModal.style.display =
        "none";

    document.body.style.overflow =
        "";

}


// ------------------------------------------------------------
// EDIT PROFILE BUTTON
// ------------------------------------------------------------

document
    .getElementById("editProfileBtn")
    ?.addEventListener(
        "click",
        openProfileEditModal
    );


// ------------------------------------------------------------
// CLOSE BUTTON
// ------------------------------------------------------------

document
    .getElementById("closeProfileEditModal")
    ?.addEventListener(
        "click",
        closeProfileEditModal
    );


// ------------------------------------------------------------
// CANCEL BUTTON
// ------------------------------------------------------------

document
    .getElementById("cancelProfileEdit")
    ?.addEventListener(
        "click",
        closeProfileEditModal
    );


// ------------------------------------------------------------
// CLICK OUTSIDE MODAL
// ------------------------------------------------------------

profileEditModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            profileEditModal
        ) {

            closeProfileEditModal();

        }

    }
);


// ------------------------------------------------------------
// Avatar upload (client-side preview only)
// ------------------------------------------------------------

document.getElementById('profileAvatarEditBtn')?.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!currentUser) {
            showToast('Session expired. Please log in again.', 'error');
            return;
        }

        // Basic validation
        if (!file.type || !file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
            return;
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            showToast('Please select an image smaller than 5MB.', 'error');
            return;
        }

        // Immediate local preview using object URL while upload runs
        const previewUrl = URL.createObjectURL(file);
        const avatarIds = ['profileAvatar', 'userAvatar', 'topAvatar'];
        avatarIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('has-image');
                el.style.backgroundImage = buildSafeBackgroundImage(previewUrl);
                el.textContent = '';
            }
        });

        // Prepare safe upload path: profile-photos/<user-id>/<timestamp>_<sanitized-filename>
        const extension = (file.name && file.name.split('.').pop()) || 'png';
        const sanitizedFilename = (file.name || `${Date.now()}.${extension}`).replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `profile-photos/${currentUser.id}/${Date.now()}_${sanitizedFilename}`;

        try {
            // Upload to existing 'content-files' bucket (reuse existing bucket)
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('content-files')
                .upload(path, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL for uploaded file
            const { data: publicData, error: publicError } = supabaseClient.storage.from('content-files').getPublicUrl(path);
            if (publicError || !publicData?.publicUrl) {
                throw new Error('Unable to obtain public URL for uploaded image.');
            }
            const publicUrl = publicData.publicUrl;

            // Persist url to user_profiles.avatar_url
            const { data: updated, error: updateError } = await supabaseClient
                .from('user_profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id)
                .select()
                .single();

            if (updateError) {
                // Attempt to remove uploaded file to avoid orphaned storage
                try {
                    await supabaseClient.storage.from('content-files').remove([path]);
                } catch (remErr) {
                    console.warn('Failed to remove uploaded file after DB update failure', remErr);
                }

                showToast('Profile photo uploaded to storage but could not be saved to your profile. Ask an admin to add avatar_url to user_profiles or adjust policies. The photo preview will be visible now but will not persist after refresh.', 'error');

                // Keep preview so user sees the uploaded image until refresh
                return;
            }

            // Success: update in-memory profile and UI with persisted public URL
            if (!currentProfile) currentProfile = {};
            currentProfile.avatar_url = updated?.avatar_url ?? publicUrl;

            avatarIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('has-image');
                    el.style.backgroundImage = buildSafeBackgroundImage(currentProfile.avatar_url);
                    el.textContent = '';
                }
            });

            showToast('Profile photo updated successfully.', 'success');
        } catch (err) {
            console.error('Avatar upload error:', err);
            showToast('Unable to upload profile photo: ' + (err?.message || err), 'error');
        } finally {
            // Always revoke the temporary object URL to avoid leaks
            try { URL.revokeObjectURL(previewUrl); } catch (e) { /* ignore */ }
        }
    });

    input.click();
});

// ------------------------------------------------------------
// Download Card button
// ------------------------------------------------------------

document.getElementById('downloadBusinessCard')?.addEventListener('click', async () => {
    const card = document.getElementById('businessCard');
    if (!card) {
        showToast('Business card not found on the page.', 'error');
        return;
    }

    if (typeof html2canvas === 'undefined') {
        showToast('Download library not loaded.', 'error');
        return;
    }

    try {
        await new Promise(r => setTimeout(r, 80));
        const canvas = await html2canvas(card, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0
        });

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const filename = `${(currentProfile?.full_name || 'business-card').replace(/[^a-z0-9-_.]/gi, '_')}.png`;
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Business card downloaded.', 'success');
    } catch (err) {
        console.error('Download card error:', err);
        showToast('Unable to download card: ' + (err?.message || err), 'error');
    }
});

const flipButton = document.getElementById('flipCardBtn');
const businessCard = document.getElementById('businessCard');
if (businessCard && flipButton) {
    

    flipButton.addEventListener('click', toggleBusinessCardFlip);
    businessCard.addEventListener('click', toggleBusinessCardFlip);
}


// ------------------------------------------------------------
// SAVE PROFILE
// ------------------------------------------------------------

profileEditForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!currentUser) {

            showToast(
                "Your session has expired. Please log in again.", 'error'
            );

            return;

        }


        const saveButton =
            document.getElementById(
                "saveProfileBtn"
            );


        const fullName =
            document.getElementById(
                "editProfileName"
            )?.value.trim();


        // Role is not editable by normal partners; show it read-only in the modal
        const role =
            document.getElementById(
                "editProfileRole"
            )?.value.trim();

        const position =
            document.getElementById(
                "editProfilePosition"
            )?.value.trim();

        const phone =
            document.getElementById(
                "editProfilePhone"
            )?.value.trim();


        const address =
            document.getElementById(
                "editProfileAddress"
            )?.value.trim();


        const facebook =
            document.getElementById(
                "editProfileFacebook"
            )?.value.trim();


        if (!fullName) {

            showToast(
                "Please enter your full name.", 'error'
            );

            return;

        }


        // Role is managed by the system; no position required for partners.

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";

        }


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("user_profiles")
                    .update({

                        full_name:
                            fullName,

                        mobile:
                            phone ||
                            null,

                        address:
                            address ||
                            null,

                        fb_profile:
                            facebook ||
                            null,

                        position:
                            position || null

                    })
                    .eq(
                        "id",
                        currentUser.id
                    )
                    .select()
                    .single();


            if (error) {

                throw error;

            }


            if (data) {

                currentProfile =
                    data;

            }


            updateUserInterface();

            updateProfileUI();

            closeProfileEditModal();

            showToast(
                "Profile updated successfully.", 'success'
            );


        } catch (error) {

            console.error(
                "Profile update error:",
                error
            );

            showToast(
                "Unable to update profile: " + (error?.message || "Unknown error"), 'error'
            );


        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Changes";

            }

        }

    }
);

// ============================================================
// LOGOUT
// ============================================================

document
    .getElementById("logoutBtn")
    ?.addEventListener(
        "click",
        async () => {

            try {

                await supabaseClient.auth.signOut();

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

            finally {

                window.location.href =
                    "index.html";

            }

        }
    );


// ============================================================
// TABS
// ============================================================

function showTab(tabName) {

    // --------------------------------------------------------
    // Navigation
    // --------------------------------------------------------

    document
        .querySelectorAll(".nav-item")
        .forEach((item) => {

            item.classList.toggle(
                "active",
                item.dataset.tab === tabName
            );

        });


    // --------------------------------------------------------
    // Hide all tabs
    // --------------------------------------------------------

    document
        .querySelectorAll("[id^='tab-']")
        .forEach((tab) => {

            tab.style.display = "none";

        });


    // --------------------------------------------------------
    // Show selected tab
    // --------------------------------------------------------

    const target =
        document.getElementById(
            "tab-" + tabName
        );


    if (target) {

        target.style.display = "block";

    }


    // --------------------------------------------------------
    // Reload dashboard
    // --------------------------------------------------------

    if (tabName === "dashboard") {

        loadDashboard();

    }

    if (tabName === "team-chat") {

    teamChatUnreadCount = 0;

    updateTeamChatUnreadUI();

    initializeTeamChat();

    }

    // --------------------------------------------------------
    // Reload content
    // --------------------------------------------------------

    if (tabName === "content") {

        loadContent();

    }


    // --------------------------------------------------------
    // Reload orders
    // --------------------------------------------------------

    if (tabName === "orders") {

        loadOrders();

    }


    // --------------------------------------------------------
    // Reload admin
    // --------------------------------------------------------

    if (
        tabName === "admin" &&
        currentProfile?.role === "admin"
    ) {

        loadJoinRequests();

        loadPendingContent();

    }

}


// ------------------------------------------------------------
// Sidebar navigation
// ------------------------------------------------------------

document
    .querySelectorAll(".nav-item")
    .forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                showTab(
                    item.dataset.tab
                );

            }
        );

    });


// ------------------------------------------------------------
// Dashboard View All buttons
// ------------------------------------------------------------

document
    .querySelectorAll("[data-go-tab]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                showTab(
                    button.dataset.goTab
                );

            }
        );

    });


// ============================================================
// CONTENT IDEAS
// ============================================================


// ============================================================
// ADD IDEA
// ============================================================

const contentForm =
    document.getElementById("contentForm");


contentForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Your session has expired. Please log in again."
            );

            return;
        }


        const button =
            document.getElementById(
                "contentSubmitBtn"
            );


        const file =
            document
                .getElementById("fileInput")
                ?.files?.[0];


        const title =
            document
                .getElementById("titleInput")
                ?.value
                .trim();


        const category =
            document
                .getElementById("categoryInput")
                ?.value;


        const caption =
            document
                .getElementById("captionInput")
                ?.value
                .trim();


        if (
            !file ||
            !title ||
            !category ||
            !caption
        ) {

            alert(
                "Please fill in all fields."
            );

            return;
        }


        if (button) {

            button.disabled = true;

            button.textContent =
                "Submitting...";

        }


        try {

            // ------------------------------------------------
            // File extension
            // ------------------------------------------------

            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            // ------------------------------------------------
            // File path
            // ------------------------------------------------

            const filePath =
                `${currentUser.id}/${Date.now()}.${extension}`;


            // ------------------------------------------------
            // Upload image
            // ------------------------------------------------

            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from("content-files")
                    .upload(
                        filePath,
                        file,
                        {
                            upsert: false
                        }
                    );


            if (uploadError) {

                throw uploadError;

            }


            // ------------------------------------------------
            // Get public URL
            // ------------------------------------------------

            const {
                data: publicUrlData
            } =
                supabaseClient
                    .storage
                    .from("content-files")
                    .getPublicUrl(
                        filePath
                    );


            const fileUrl =
                publicUrlData?.publicUrl;


            if (!fileUrl) {

                throw new Error(
                    "Could not generate image URL."
                );

            }


            // ------------------------------------------------
            // Insert content
            // ------------------------------------------------

            const {
                error: insertError
            } =
                await supabaseClient
                    .from("content")
                    .insert({

                        title:
                            title,

                        category:
                            category,

                        file_url:
                            fileUrl,

                        caption:
                            caption,

                        status:
                            "pending_approval",

                        created_by:
                            currentUser.id

                    });


            if (insertError) {

                throw insertError;

            }


            // ------------------------------------------------
            // Reset
            // ------------------------------------------------

            contentForm.reset();

            closeIdeaModal();


            // ------------------------------------------------
            // Reload
            // ------------------------------------------------

            await loadContent();


            if (
                currentProfile?.role ===
                "admin"
            ) {

                await loadPendingContent();

            }


            alert(
                "Content idea submitted successfully."
            );

        }

        catch (error) {

            console.error(
                "Content submission error:",
                error
            );


            alert(
                "Problem: " +
                (
                    error?.message ||
                    "Unable to submit content."
                )
            );

        }

        finally {

            if (button) {

                button.disabled = false;

                button.textContent =
                    "Submit Idea";

            }

        }

    }
);


// ============================================================
// LOAD CONTENT
// ============================================================

async function loadContent() {

    const grid =
        document.getElementById(
            "contentGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `
        <div class="empty-state">
            Loading...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("content")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Content loading error:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                Problem: ${esc(error.message)}
            </div>
        `;

        return;
    }


    allContentIdeas =
        data || [];


    renderContentIdeas();

}


// ============================================================
// RENDER CONTENT
// ============================================================

function renderContentIdeas() {

    const grid =
        document.getElementById(
            "contentGrid"
        );


    if (!grid) {
        return;
    }


    const search =
        (
            document
                .getElementById(
                    "contentSearch"
                )
                ?.value ||
            ""
        )
            .toLowerCase()
            .trim();


    let filtered =
        [...allContentIdeas];


    // --------------------------------------------------------
    // Filter
    // --------------------------------------------------------

    if (
        currentContentFilter ===
        "mine"
    ) {

        if (currentUser) {

            filtered =
                filtered.filter(
                    (item) =>
                        item.created_by ===
                        currentUser.id
                );

        }

    }

    else if (
        currentContentFilter !==
        "all"
    ) {

        filtered =
            filtered.filter(
                (item) =>
                    item.status ===
                    currentContentFilter
            );

    }


    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    if (search) {

        filtered =
            filtered.filter(
                (item) => {

                    const text = `
                        ${item.title || ""}
                        ${item.category || ""}
                        ${item.caption || ""}
                    `.toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    // --------------------------------------------------------
    // Empty
    // --------------------------------------------------------

    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                No content ideas found.
            </div>
        `;

        return;
    }


    // --------------------------------------------------------
    // Status labels
    // --------------------------------------------------------

    const statusMap = {

        pending_approval: [
            "badge-draft",
            "Pending Approval"
        ],

        posted: [
            "badge-ready",
            "Posted"
        ],

        rejected: [
            "badge-posted",
            "Rejected"
        ]

    };


    // --------------------------------------------------------
    // Cards
    // --------------------------------------------------------

    grid.innerHTML =
        filtered
            .map((item) => {

                const status =
                    statusMap[
                        item.status
                    ] ||
                    [
                        "badge-draft",
                        item.status ||
                        "Unknown"
                    ];


                const date =
                    item.created_at
                        ? new Date(
                            item.created_at
                        ).toLocaleDateString(
                            "en-GB",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        )
                        : "";


                return `

                    <div
                        class="card content-card"
                        data-content-id="${esc(item.id)}"
                    >

                        <img
                            src="${esc(item.file_url)}"
                            alt="${esc(
                                item.title ||
                                "Content Idea"
                            )}"
                        >

                        <div class="card-body">

                            <div class="content-category">
                                ${esc(
                                    item.category ||
                                    "Other"
                                )}
                            </div>


                            <h3 class="content-title">
                                ${esc(
                                    item.title ||
                                    "Untitled Idea"
                                )}
                            </h3>


                            <div class="caption">
                                ${esc(
                                    item.caption ||
                                    ""
                                )}
                            </div>


                            <div class="card-meta">

                                <span
                                    class="badge ${status[0]}"
                                >
                                    ${esc(
                                        status[1]
                                    )}
                                </span>


                                <span>
                                    ${esc(date)}
                                </span>

                            </div>


                            <button
                                type="button"
                                class="content-view-btn"
                                data-view-content="${esc(item.id)}"
                            >
                                View Details →
                            </button>

                        </div>

                    </div>

                `;

            })
            .join("");


    // --------------------------------------------------------
    // Details buttons
    // --------------------------------------------------------

    grid
        .querySelectorAll(
            "[data-view-content]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    openContentDetails(
                        button.dataset
                            .viewContent
                    );

                }
            );

        });

}


// ============================================================
// CONTENT SEARCH
// ============================================================

document
    .getElementById(
        "contentSearch"
    )
    ?.addEventListener(
        "input",
        () => {

            renderContentIdeas();

        }
    );


// ============================================================
// CONTENT FILTERS
// ============================================================

document
    .querySelectorAll(
        ".filter-btn"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".filter-btn"
                    )
                    .forEach(
                        (item) => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                button.classList.add(
                    "active"
                );


                currentContentFilter =
                    button.dataset.filter;


                renderContentIdeas();

            }
        );

    });


// ============================================================
// IDEA MODAL
// ============================================================

const ideaModal =
    document.getElementById(
        "ideaModal"
    );


function closeIdeaModal() {

    if (!ideaModal) {
        return;
    }


    ideaModal.style.display =
        "none";


    document.body.style.overflow =
        "";

}


document
    .getElementById(
        "openIdeaModal"
    )
    ?.addEventListener(
        "click",
        () => {

            if (!ideaModal) {
                return;
            }


            ideaModal.style.display =
                "flex";


            document.body.style.overflow =
                "hidden";

        }
    );


document
    .getElementById(
        "closeIdeaModal"
    )
    ?.addEventListener(
        "click",
        closeIdeaModal
    );


document
    .getElementById(
        "cancelIdea"
    )
    ?.addEventListener(
        "click",
        closeIdeaModal
    );


ideaModal?.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            ideaModal
        ) {

            closeIdeaModal();

        }

    }
);


// ============================================================
// CONTENT DETAILS
// ============================================================

function openContentDetails(id) {

    const item =
        allContentIdeas.find(
            (content) =>
                String(content.id) ===
                String(id)
        );


    if (!item) {
        return;
    }


    const modal =
        document.getElementById(
            "contentDetailsModal"
        );


    if (!modal) {
        return;
    }


    const statusLabels = {

        pending_approval:
            "Pending Approval",

        posted:
            "Posted",

        rejected:
            "Rejected"

    };


    const statusText =
        statusLabels[
            item.status
        ] ||
        item.status ||
        "Unknown";


    modal.innerHTML = `

        <div class="details-modal">

            <div class="modal-header">

                <div>

                    <span class="modal-eyebrow">
                        CONTENT DETAILS
                    </span>

                    <h2>
                        Idea Details
                    </h2>

                </div>


                <button
                    type="button"
                    class="modal-close"
                    id="closeDetailsModal"
                >
                    ×
                </button>

            </div>


            <div class="details-layout">


                <div class="details-image-wrap">

                    <img
                        src="${esc(item.file_url)}"
                        alt="${esc(
                            item.title ||
                            "Content Idea"
                        )}"
                    >

                </div>


                <div class="details-info">


                    <span
                        class="details-status"
                        id="detailsStatus"
                    >
                        ${esc(statusText)}
                    </span>


                    <h2 id="detailsTitle">
                        ${esc(
                            item.title ||
                            "Untitled Idea"
                        )}
                    </h2>


                    <div class="details-section">

                        <span>
                            Category
                        </span>

                        <p>
                            ${esc(
                                item.category ||
                                "Other"
                            )}
                        </p>

                    </div>


                    <div class="details-section">

                        <span>
                            Description
                        </span>

                        <p>
                            ${esc(
                                item.caption ||
                                "No description"
                            )}
                        </p>

                    </div>


                    <div class="details-section">

                        <span>
                            Created By
                        </span>

                        <p id="detailsSubmittedBy">
                            Loading...
                        </p>

                    </div>


                    <div class="details-section">

                        <span>
                            Created At
                        </span>

                        <p>
                            ${
                                item.created_at
                                    ? esc(
                                        new Date(
                                            item.created_at
                                        ).toLocaleString(
                                            "en-GB"
                                        )
                                    )
                                    : "—"
                            }
                        </p>

                    </div>


                    ${
                        currentProfile?.role ===
                            "admin" &&
                        item.status ===
                            "pending_approval"

                            ? `

                                <div
                                    class="details-actions"
                                >

                                    <button
                                        type="button"
                                        class="btn-add"
                                        id="detailApproveBtn"
                                    >
                                        Approve & Post
                                    </button>


                                    <button
                                        type="button"
                                        class="btn-reject"
                                        id="detailRejectBtn"
                                    >
                                        Reject
                                    </button>

                                </div>

                            `

                            : ""
                    }


                </div>

            </div>

        </div>

    `;


    modal.style.display =
        "flex";


    document.body.style.overflow =
        "hidden";


    document
        .getElementById(
            "closeDetailsModal"
        )
        ?.addEventListener(
            "click",
            () => {

                modal.style.display =
                    "none";

                document.body.style.overflow =
                    "";

            }
        );


    document
        .getElementById(
            "detailApproveBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                reviewContent(
                    item.id,
                    "posted"
                );

            }
        );


    document
        .getElementById(
            "detailRejectBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                reviewContent(
                    item.id,
                    "rejected"
                );

            }
        );


    loadContentCreator(
        item.created_by
    );

}


// ============================================================
// LOAD CONTENT CREATOR
// ============================================================

async function loadContentCreator(
    userId
) {

    const element =
        document.getElementById(
            "detailsSubmittedBy"
        );


    if (!element) {
        return;
    }


    if (!userId) {

        element.textContent =
            "Unknown partner";

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("user_profiles")
            .select(
                "full_name, role"
            )
            .eq("id", userId)
            .single();


    if (error || !data) {

        element.textContent =
            "Unknown partner";

        return;
    }


    element.textContent =
        `${data.full_name || "Unknown"}${
            data.role
                ? " • " +
                  data.role
                : ""
        }`;

}


// ============================================================
// CUSTOMERS
// ============================================================

async function loadCustomers() {

    const select =
        document.getElementById(
            "customerSelect"
        );


    if (!select) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("customers")
            .select("*")
            .order(
                "name",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Customers loading error:",
            error
        );

        return;
    }


    select.innerHTML = `

        <option value="">
            -- New Customer --
        </option>

    `;


    (data || []).forEach(
        (customer) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                customer.id;


            option.textContent =
                customer.name ||
                "Unnamed Customer";


            select.appendChild(
                option
            );

        }
    );

}


// ============================================================
// ORDER FORM
// ============================================================

const orderForm =
    document.getElementById(
        "orderForm"
    );


orderForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Your session has expired. Please log in again."
            );

            return;
        }


        const button =
            document.getElementById(
                "orderSubmitBtn"
            );


        if (button) {

            button.disabled = true;

            button.textContent =
                "Adding...";

        }


        try {

            let customerId =
                document
                    .getElementById(
                        "customerSelect"
                    )
                    ?.value;


            const newName =
                document
                    .getElementById(
                        "newCustomerName"
                    )
                    ?.value
                    .trim();


            const newContact =
                document
                    .getElementById(
                        "newCustomerContact"
                    )
                    ?.value
                    .trim();


            // ------------------------------------------------
            // Create new customer
            // ------------------------------------------------

            if (
                !customerId &&
                newName
            ) {

                const {
                    data: newCustomer,
                    error: customerError
                } =
                    await supabaseClient
                        .from("customers")
                        .insert({

                            name:
                                newName,

                            contact:
                                newContact ||
                                null

                        })
                        .select()
                        .single();


                if (customerError) {

                    throw customerError;

                }


                customerId =
                    newCustomer.id;

            }


            if (!customerId) {

                throw new Error(
                    "Please select an existing customer or enter a new customer name."
                );

            }


            const details =
                document
                    .getElementById(
                        "orderDetails"
                    )
                    ?.value
                    .trim();


            const price =
                document
                    .getElementById(
                        "price"
                    )
                    ?.value
                    .trim();


            const deliveryTime =
                document
                    .getElementById(
                        "deliveryTime"
                    )
                    ?.value ||
                null;


            const status =
                document
                    .getElementById(
                        "orderStatus"
                    )
                    ?.value ||
                "new";


            if (!details) {

                throw new Error(
                    "Please enter order details."
                );

            }


            // ------------------------------------------------
            // Insert order
            // ------------------------------------------------

            const {
                error
            } =
                await supabaseClient
                    .from("orders")
                    .insert({

                        customer_id:
                            customerId,

                        details:
                            details,

                        price:
                            price ||
                            null,

                        delivery_time:
                            deliveryTime,

                        status:
                            status,

                        created_by:
                            currentUser.id

                    });


            if (error) {

                throw error;

            }


            // ------------------------------------------------
            // Reset
            // ------------------------------------------------

            orderForm.reset();


            closeOrderModal();


            await loadCustomers();

            await loadOrders();

            await loadDashboard();


            alert(
                "Order added successfully."
            );

        }

        catch (error) {

            console.error(
                "Order submission error:",
                error
            );


            alert(
                "Problem: " +
                (
                    error?.message ||
                    "Unable to add order."
                )
            );

        }

        finally {

            if (button) {

                button.disabled = false;

                button.textContent =
                    "Add Order";

            }

        }

    }
);


// ============================================================
// LOAD ORDERS
// ============================================================

async function loadOrders() {

    const body =
        document.getElementById(
            "ordersBody"
        );


    if (!body) {
        return;
    }


    body.innerHTML = `

        <tr>

            <td
                colspan="5"
                class="empty-state"
            >
                Loading...
            </td>

        </tr>

    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("orders")
            .select(
                "*, customers(name, contact)"
            )
            .order(
                "order_time",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Orders loading error:",
            error
        );


        body.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-state"
                >
                    Problem: ${esc(
                        error.message
                    )}
                </td>

            </tr>

        `;

        return;
    }


    if (!data || !data.length) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-state"
                >
                    No orders yet.
                </td>

            </tr>

        `;

        return;
    }


    body.innerHTML =
        data
            .map((order) => {

                const delivery =
                    order.delivery_time
                        ? new Date(
                            order.delivery_time
                        ).toLocaleString(
                            "en-GB",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )
                        : "—";


                const customerName =
                    order.customers?.name ||
                    "—";


                const customerContact =
                    order.customers?.contact ||
                    "";


                const statuses = [
                    "new",
                    "confirmed",
                    "in_progress",
                    "ready",
                    "delivered",
                    "cancelled"
                ];


                return `

                    <tr>

                        <td>

                            ${esc(
                                customerName
                            )}

                            <br>

                            <span
                                style="
                                    color:var(--text-dim);
                                    font-size:12px;
                                "
                            >
                                ${esc(
                                    customerContact
                                )}
                            </span>

                        </td>


                        <td>
                            ${esc(
                                order.details ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${esc(
                                order.price ||
                                "—"
                            )}
                        </td>


                        <td>
                            ${esc(
                                delivery
                            )}
                        </td>


                        <td>

                            <select
                                class="status-select"
                                data-id="${esc(
                                    order.id
                                )}"
                            >

                                ${
                                    statuses
                                        .map(
                                            (status) => {

                                                const label =
                                                    status
                                                        .replace(
                                                            "_",
                                                            " "
                                                        )
                                                        .replace(
                                                            /\b\w/g,
                                                            (char) =>
                                                                char.toUpperCase()
                                                        );


                                                return `

                                                    <option
                                                        value="${esc(status)}"
                                                        ${
                                                            order.status ===
                                                            status
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >
                                                        ${esc(label)}
                                                    </option>

                                                `;

                                            }
                                        )
                                        .join("")
                                }

                            </select>

                        </td>

                    </tr>

                `;

            })
            .join("");


    // --------------------------------------------------------
    // Status change
    // --------------------------------------------------------

    body
        .querySelectorAll(
            ".status-select"
        )
        .forEach((select) => {

            select.addEventListener(
                "change",
                async () => {

                    const {
                        error: updateError
                    } =
                        await supabaseClient
                            .from("orders")
                            .update({

                                status:
                                    select.value,

                                updated_at:
                                    new Date()
                                        .toISOString()

                            })
                            .eq(
                                "id",
                                select.dataset.id
                            );


                    if (updateError) {

                        console.error(
                            "Order update error:",
                            updateError
                        );


                        alert(
                            "Problem: " +
                            updateError.message
                        );

                        return;
                    }


                    await loadDashboard();

                }
            );

        });

}


// ============================================================
// ADMIN - JOIN REQUESTS
// ============================================================

async function loadJoinRequests() {

    const list =
        document.getElementById(
            "joinRequestsList"
        );


    if (!list) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("user_profiles")
            .select("*")
            .eq(
                "status",
                "pending"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Join requests error:",
            error
        );


        list.innerHTML = `

            <div class="empty-state">
                Problem: ${esc(
                    error.message
                )}
            </div>

        `;

        return;
    }


    if (!data || !data.length) {

        list.innerHTML = `

            <div class="empty-state">
                No pending partner requests.
            </div>

        `;

        return;
    }


    list.innerHTML =
        data
            .map((profile) => {

                return `

    <div class="join-request-card">

        <div class="join-request-info">

            <h4 class="join-request-name">
                ${esc(
                    profile.full_name ||
                    "Unnamed Partner"
                )}
            </h4>


            <div class="join-request-detail">

                ${
                    profile.mobile
                        ? `
                            <span>
                                📱 ${esc(profile.mobile)}
                            </span>
                          `
                        : ""
                }


                ${
                    profile.address
                        ? `
                            <span>
                                🏠 ${esc(profile.address)}
                            </span>
                          `
                        : ""
                }


                ${
                    profile.fb_profile
                        ? `
                            <span>
                                🔗 ${esc(profile.fb_profile)}
                            </span>
                          `
                        : ""
                }

            </div>

        </div>


        <div class="join-request-actions">

            <button
                type="button"
                class="approve-btn"
                data-approve="${esc(profile.id)}"
            >
                Approve
            </button>


            <button
                type="button"
                class="reject-btn"
                data-reject="${esc(profile.id)}"
            >
                Reject
            </button>

        </div>

    </div>

            `;

            })
            .join("");


    // --------------------------------------------------------
    // Approve
    // --------------------------------------------------------

    list
        .querySelectorAll(
            "[data-approve]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    reviewRequest(
                        button.dataset.approve,
                        "approved"
                    );

                }
            );

        });


    // --------------------------------------------------------
    // Reject
    // --------------------------------------------------------

    list
        .querySelectorAll(
            "[data-reject]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    reviewRequest(
                        button.dataset.reject,
                        "rejected"
                    );

                }
            );

        });

}


// ============================================================
// REVIEW PARTNER REQUEST
// ============================================================

async function reviewRequest(
    id,
    status
) {

    if (
        currentProfile?.role !==
        "admin"
    ) {

        alert(
            "Only administrators can perform this action."
        );

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("user_profiles")
            .update({
                status: status
            })
            .eq(
                "id",
                id
            );


    if (error) {

        alert(
            "Problem: " +
            error.message
        );

        return;
    }


    await loadJoinRequests();

}


// ============================================================
// ADMIN - PENDING CONTENT
// ============================================================

async function loadPendingContent() {

    const grid =
        document.getElementById(
            "pendingContentGrid"
        );


    if (!grid) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("content")
            .select("*")
            .eq(
                "status",
                "pending_approval"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Pending content error:",
            error
        );


        grid.innerHTML = `

            <div class="empty-state">
                Problem: ${esc(
                    error.message
                )}
            </div>

        `;

        return;
    }


    if (!data || !data.length) {

        grid.innerHTML = `

            <div class="empty-state">
                Nothing waiting for approval.
            </div>

        `;

        return;
    }


    grid.innerHTML =
        data
            .map((item) => {

                return `

                    <div
                        class="card content-card"
                    >

                        <img
                            src="${esc(
                                item.file_url
                            )}"
                            alt="${esc(
                                item.title ||
                                "Content Idea"
                            )}"
                        >


                        <div class="card-body">


                            <div
                                class="content-category"
                            >
                                ${esc(
                                    item.category ||
                                    "Other"
                                )}
                            </div>


                            <h3
                                class="content-title"
                            >
                                ${esc(
                                    item.title ||
                                    "Untitled Idea"
                                )}
                            </h3>


                            <div
                                class="caption"
                            >
                                ${esc(
                                    item.caption ||
                                    ""
                                )}
                            </div>


                            <div
                                class="details-actions"
                                style="
                                    margin-top:14px;
                                    display:flex;
                                    gap:8px;
                                "
                            >

                                <button
                                    type="button"
                                    class="btn-add"
                                    data-post="${esc(
                                        item.id
                                    )}"
                                >
                                    Approve & Post
                                </button>


                                <button
                                    type="button"
                                    class="btn-reject"
                                    data-rejectc="${esc(
                                        item.id
                                    )}"
                                >
                                    Reject
                                </button>

                            </div>


                        </div>

                    </div>

                `;

            })
            .join("");


    // --------------------------------------------------------
    // Approve
    // --------------------------------------------------------

    grid
        .querySelectorAll(
            "[data-post]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    reviewContent(
                        button.dataset.post,
                        "posted"
                    );

                }
            );

        });


    // --------------------------------------------------------
    // Reject
    // --------------------------------------------------------

    grid
        .querySelectorAll(
            "[data-rejectc]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    reviewContent(
                        button.dataset.rejectc,
                        "rejected"
                    );

                }
            );

        });

}


// ============================================================
// REVIEW CONTENT
// ============================================================

async function reviewContent(
    id,
    status
) {

    if (
        currentProfile?.role !==
        "admin"
    ) {

        alert(
            "Only administrators can review content."
        );

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("content")
            .update({

                status:
                    status,

                approved_by:
                    currentUser.id

            })
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "Content review error:",
            error
        );


        alert(
            "Problem: " +
            error.message
        );

        return;
    }


    const modal =
        document.getElementById(
            "contentDetailsModal"
        );


    if (modal) {

        modal.style.display =
            "none";

        document.body.style.overflow =
            "";

    }


    await loadPendingContent();

    await loadContent();

    await loadDashboard();

}


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    if (
        !currentUser ||
        !currentProfile
    ) {

        return;
    }


    // --------------------------------------------------------
    // Name
    // --------------------------------------------------------

    const firstName =
        currentProfile.full_name
            ? currentProfile.full_name
                .split(" ")[0]
            : "Partner";


    const dashboardName =
        document.getElementById(
            "dashboardName"
        );


    if (dashboardName) {

        dashboardName.textContent =
            firstName;

    }


    // --------------------------------------------------------
    // Profile
    // --------------------------------------------------------

    const profileName =
        document.getElementById(
            "profileName"
        );


    if (profileName) {

        profileName.textContent =
            currentProfile.full_name ||
            "—";

    }


    const profilePosition =
        document.getElementById(
            "profilePosition"
        );


    if (profilePosition) {

        profilePosition.textContent =
            currentProfile.role ||
            "Partner";

    }


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );


    if (profileEmail) {

        profileEmail.textContent =
            currentUser.email ||
            "—";

    }


    const profilePhone =
        document.getElementById(
            "profilePhone"
        );


    if (profilePhone) {

        profilePhone.textContent =
            currentProfile.mobile ||
            "—";

    }


    // --------------------------------------------------------
    // Avatar
    // --------------------------------------------------------

    const initial =
        (
            currentProfile.full_name ||
            "A"
        )
            .charAt(0)
            .toUpperCase();


    [
        "userAvatar",
        "topAvatar",
        "profileAvatar"
    ].forEach((id) => {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                initial;

        }

    });


    // --------------------------------------------------------
    // Content count
    // --------------------------------------------------------

    const {
        count: ideasCount
    } =
        await supabaseClient
            .from("content")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            );


    // --------------------------------------------------------
    // Orders count
    // --------------------------------------------------------

    const {
        count: ordersCount
    } =
        await supabaseClient
            .from("orders")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            );


    // --------------------------------------------------------
    // Update stats
    // --------------------------------------------------------

    const statIdeas =
        document.getElementById(
            "statIdeas"
        );


    const statOrders =
        document.getElementById(
            "statOrders"
        );


    if (statIdeas) {

        statIdeas.textContent =
            ideasCount ?? 0;

    }


    if (statOrders) {

        statOrders.textContent =
            ordersCount ?? 0;

    }


    // --------------------------------------------------------
    // Recent ideas
    // --------------------------------------------------------

    const {
        data: recentIdeas
    } =
        await supabaseClient
            .from("content")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(4);


    const ideasContainer =
        document.getElementById(
            "dashboardIdeas"
        );


    if (ideasContainer) {

        if (
            !recentIdeas ||
            !recentIdeas.length
        ) {

            ideasContainer.innerHTML = `

                <div class="dashboard-empty">
                    No content ideas yet.
                </div>

            `;

        }

        else {

            ideasContainer.innerHTML =
                recentIdeas
                    .map((item) => {

                        const status =
                            {

                                pending_approval:
                                    "Pending",

                                posted:
                                    "Posted",

                                rejected:
                                    "Rejected"

                            }[
                                item.status
                            ] ||
                            item.status ||
                            "Unknown";


                        return `

                            <div
                                class="dashboard-list-item"
                            >

                                <img
                                    src="${esc(
                                        item.file_url
                                    )}"
                                    alt=""
                                >


                                <div>

                                    <strong>
                                        ${esc(
                                            item.title ||
                                            item.caption ||
                                            "Untitled idea"
                                        )}
                                    </strong>


                                    <span>
                                        ${esc(
                                            status
                                        )}
                                    </span>

                                </div>

                            </div>

                        `;

                    })
                    .join("");

        }

    }


    // --------------------------------------------------------
    // Recent orders
    // --------------------------------------------------------

    const {
        data: recentOrders
    } =
        await supabaseClient
            .from("orders")
            .select(
                "*, customers(name, contact)"
            )
            .order(
                "order_time",
                {
                    ascending: false
                }
            )
            .limit(4);


    const ordersContainer =
        document.getElementById(
            "dashboardOrders"
        );


    if (ordersContainer) {

        if (
            !recentOrders ||
            !recentOrders.length
        ) {

            ordersContainer.innerHTML = `

                <div class="dashboard-empty">
                    No orders yet.
                </div>

            `;

        }

        else {

            ordersContainer.innerHTML =
                recentOrders
                    .map((order) => {

                        return `

                            <div
                                class="dashboard-order-item"
                            >

                                <div>

                                    <strong>
                                        ${esc(
                                            order
                                                .customers
                                                ?.name ||
                                            "Unknown Customer"
                                        )}
                                    </strong>


                                    <span>
                                        ${esc(
                                            order.details ||
                                            "No details"
                                        )}
                                    </span>

                                </div>


                                <b>
                                    ${esc(
                                        order.status ||
                                        "new"
                                    )}
                                </b>

                            </div>

                        `;

                    })
                    .join("");

        }

    }

}

// ============================================================
// NOTIFICATION SYSTEM
// ============================================================

let notificationChannel = null;
// ============================================================
// ORDER MODAL
// ============================================================

const orderModal =
    document.getElementById(
        "orderModal"
    );


const openOrderModalButton =
    document.getElementById(
        "openOrderModal"
    );


const closeOrderModalButton =
    document.getElementById(
        "closeOrderModal"
    );


const cancelOrderButton =
    document.getElementById(
        "cancelOrder"
    );


function closeOrderModal() {

    if (!orderModal) {
        return;
    }


    orderModal.style.display =
        "none";


    document.body.style.overflow =
        "";

}


openOrderModalButton?.addEventListener(
    "click",
    () => {

        if (!orderModal) {
            return;
        }


        orderModal.style.display =
            "flex";


        document.body.style.overflow =
            "hidden";

    }
);


closeOrderModalButton?.addEventListener(
    "click",
    closeOrderModal
);


cancelOrderButton?.addEventListener(
    "click",
    closeOrderModal
);


orderModal?.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            orderModal
        ) {

            closeOrderModal();

        }

    }
);


// ============================================================
// ESC KEY
// ============================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        // Close idea modal

        if (
            ideaModal &&
            ideaModal.style.display ===
                "flex"
        ) {

            closeIdeaModal();

        }


        // Close order modal

        if (
            orderModal &&
            orderModal.style.display ===
                "flex"
        ) {

            closeOrderModal();

        }


        // Close details modal

        const detailsModal =
            document.getElementById(
                "contentDetailsModal"
            );


        if (
            detailsModal &&
            detailsModal.style.display ===
                "flex"
        ) {

            detailsModal.style.display =
                "none";

            document.body.style.overflow =
                "";

        }

    }
);


// ============================================================
// REALTIME
// ============================================================

function setupRealtime() {

    if (
        typeof supabaseClient ===
        "undefined"
    ) {

        return;

    }


    // --------------------------------------------------------
    // Content realtime
    // --------------------------------------------------------

    supabaseClient
        .channel(
            "content-changes"
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "content"
            },
            async () => {

                await loadContent();

                if (
                    currentProfile?.role ===
                    "admin"
                ) {

                    await loadPendingContent();

                }

                await loadDashboard();

            }
        )
        .subscribe();


    // --------------------------------------------------------
    // Orders realtime
    // --------------------------------------------------------

    supabaseClient
        .channel(
            "orders-changes"
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "orders"
            },
            async () => {

                await loadOrders();

                await loadDashboard();

            }
        )
        .subscribe();


    // --------------------------------------------------------
    // Customers realtime
    // --------------------------------------------------------

    supabaseClient
        .channel(
            "customers-changes"
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "customers"
            },
            async () => {

                await loadCustomers();

                await loadOrders();

            }
        )
        .subscribe();


    // --------------------------------------------------------
    // User profile realtime - Admin
    // --------------------------------------------------------

    if (
        currentProfile?.role ===
        "admin"
    ) {

        supabaseClient
            .channel(
                "profile-changes"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "user_profiles"
                },
                async () => {

                    await loadJoinRequests();

                }
            )
            .subscribe();

    }

}


// ============================================================
// ESCAPE HTML
// ============================================================

function esc(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


// ============================================================
// AUTH STATE LISTENER
// ============================================================

if (
    typeof supabaseClient !==
    "undefined"
) {

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "Auth state:",
                event
            );


            if (
                event ===
                    "SIGNED_OUT" &&
                window.location.pathname
                    .toLowerCase()
                    .endsWith("app.html")
            ) {

                window.location.href =
                    "index.html";

            }

        }
    );

}

// =========================================================
// TEAM CHAT
// =========================================================



// ---------------------------------------------------------
// LOAD TEAM CHAT
// ---------------------------------------------------------

async function loadTeamChat() {

    const messagesBox =
        document.getElementById("teamChatMessages");

    if (!messagesBox || !currentUser) return;

    messagesBox.innerHTML = `
        <div class="chat-loading">
            Loading messages...
        </div>
    `;

    try {

        const { data: messages, error } =
            await supabaseClient
                .from("messages")
                .select(`
                    id,
                    sender_id,
                    message,
                    created_at
                `)
                .order("created_at", {
                    ascending: true
                });

        if (error) throw error;

        if (!messages || messages.length === 0) {

            messagesBox.innerHTML = `
                <div class="chat-empty">
                    <div class="chat-empty-icon">
                        ◌
                    </div>

                    <strong>
                        No messages yet
                    </strong>

                    <span>
                        Start the conversation with your team.
                    </span>
                </div>
            `;

            return;
        }

        // Get unique sender IDs
        const senderIds = [
            ...new Set(
                messages.map(message => message.sender_id)
            )
        ];

        // Load sender profiles
        if (senderIds.length) {

            const { data: profiles, error: profileError } =
                await supabaseClient
                    .from("user_profiles")
                    .select("id, full_name, role")
                    .in("id", senderIds);

            if (profileError) {
                console.warn(
                    "Could not load sender profiles:",
                    profileError.message
                );
            }

            (profiles || []).forEach(profile => {

                teamChatProfiles[profile.id] = profile;

            });

        }

        renderTeamChat(messages);

    } catch (error) {

        console.error("Team Chat loading error:", error);

        messagesBox.innerHTML = `
            <div class="chat-error">
                Unable to load messages.
                <br>
                <small>${esc(error.message)}</small>
            </div>
        `;

    }

}


// ---------------------------------------------------------
// RENDER MESSAGES
// ---------------------------------------------------------

function renderTeamChat(messages) {

    const messagesBox =
        document.getElementById("teamChatMessages");

    if (!messagesBox) return;

    if (!messages.length) {

        messagesBox.innerHTML = `
            <div class="chat-empty">

                <div class="chat-empty-icon">
                    ◌
                </div>

                <strong>
                    No messages yet
                </strong>

                <span>
                    Start the conversation with your team.
                </span>

            </div>
        `;

        return;
    }

    messagesBox.innerHTML =
        messages.map(message => {

            const isMine =
                message.sender_id === currentUser.id;

            const profile =
                teamChatProfiles[message.sender_id];

            const senderName =
                isMine
                    ? "You"
                    : (
                        profile?.full_name ||
                        "Team Member"
                    );

            const senderPosition =
                profile?.role || "";

            const avatar =
                (
                    profile?.full_name ||
                    "T"
                )
                    .charAt(0)
                    .toUpperCase();

            const time =
                message.created_at
                    ? new Date(
                        message.created_at
                    ).toLocaleString(
                        "en-GB",
                        {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )
                    : "";

            return `
                <div
                    class="chat-message-row ${
                        isMine
                            ? "mine"
                            : "other"
                    }"
                    data-message-id="${esc(
                        message.id
                    )}"
                >

                    ${
                        !isMine
                            ? `
                                <div class="chat-avatar">
                                    ${esc(avatar)}
                                </div>
                            `
                            : ""
                    }


                    <div class="chat-message-content">

                        <div class="chat-message-meta">

                            <strong>
                                ${esc(senderName)}
                            </strong>

                            ${
                                senderPosition
                                    ? `
                                        <span>
                                            ${esc(
                                                senderPosition
                                            )}
                                        </span>
                                    `
                                    : ""
                            }

                            <time>
                                ${esc(time)}
                            </time>

                        </div>


                        <div class="chat-bubble">

                            ${esc(
                                message.message
                            ).replace(
                                /\n/g,
                                "<br>"
                            )}

                        </div>

                    </div>


                    ${
                        isMine
                            ? `
                                <div class="chat-avatar">
                                    ${esc(avatar)}
                                </div>
                            `
                            : ""
                    }

                </div>
            `;

        }).join("");

    scrollTeamChatToBottom();

}


// ---------------------------------------------------------
// SEND MESSAGE
// ---------------------------------------------------------

async function sendTeamChatMessage() {

    const input =
        document.getElementById("teamChatInput");

    const sendButton =
        document.getElementById(
            "teamChatSendBtn"
        );

    if (!input || !currentUser) return;

    const message =
        input.value.trim();

    if (!message) return;

    if (message.length > 2000) {

        alert(
            "Message cannot be longer than 2000 characters."
        );

        return;
    }

    sendButton.disabled = true;

    try {

        const { data, error } = await supabaseClient
    .from("messages")
    .insert({
        sender_id: currentUser.id,
        message: message
    })
    .select()
    .single();

if (error) {
    console.error("SUPABASE MESSAGE INSERT ERROR:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
    });

    throw error;
}

console.log("MESSAGE INSERT SUCCESS:", data);

        input.value = "";

        updateChatCharacterCount();

        /*
         * Realtime will normally render the new message.
         * We don't manually insert it here to prevent
         * duplicate messages.
         */

    } catch (error) {

        console.error(
            "Message sending error:",
            error
        );

        alert(
            "Unable to send message: " +
            error.message
        );

    } finally {

        sendButton.disabled = false;

        input.focus();

    }

}


// ---------------------------------------------------------
// CHARACTER COUNT
// ---------------------------------------------------------

function updateChatCharacterCount() {

    const input =
        document.getElementById(
            "teamChatInput"
        );

    const counter =
        document.getElementById(
            "chatCharacterCount"
        );

    if (!input || !counter) return;

    counter.textContent =
        `${input.value.length} / 2000`;

}


// ---------------------------------------------------------
// SCROLL TO BOTTOM
// ---------------------------------------------------------

function scrollTeamChatToBottom() {

    const messagesBox =
        document.getElementById(
            "teamChatMessages"
        );

    if (!messagesBox) return;

    requestAnimationFrame(() => {

        messagesBox.scrollTop =
            messagesBox.scrollHeight;

    });

}


// =========================================================
// TEAM CHAT — REALTIME + UNREAD NOTIFICATIONS
// =========================================================

    let teamChatChannel = null;
    let teamChatProfiles = {};
    
    let teamChatIsOpen = false;
    let teamChatUnreadCount = 0;

// ---------------------------------------------------------
// CHECK WHETHER TEAM CHAT IS CURRENTLY OPEN
// ---------------------------------------------------------

function isTeamChatOpen() {

    const tab =
        document.getElementById("tab-team-chat");

    if (!tab) return false;

    return (
        tab.style.display !== "none" &&
        !tab.hidden
    );
}


// =========================================================
// TEAM CHAT UNREAD + TOP NOTIFICATION BELL
// =========================================================


// ---------------------------------------------------------
// UPDATE ALL UNREAD UI
// ---------------------------------------------------------

function updateTeamChatUnreadUI() {

    // -----------------------------
    // Sidebar Team Chat badge
    // -----------------------------

    const navItem =
        document.querySelector(
            '.nav-item[data-tab="team-chat"]'
        );

    if (navItem) {

        let sidebarBadge =
            navItem.querySelector(
                ".team-chat-unread-badge"
            );

        if (teamChatUnreadCount <= 0) {

            if (sidebarBadge) {
                sidebarBadge.remove();
            }

        } else {

            if (!sidebarBadge) {

                sidebarBadge =
                    document.createElement("span");

                sidebarBadge.className =
                    "team-chat-unread-badge";

                navItem.appendChild(
                    sidebarBadge
                );
            }

            sidebarBadge.textContent =
                teamChatUnreadCount > 99
                    ? "99+"
                    : String(
                        teamChatUnreadCount
                    );
        }
    }


    // -----------------------------
    // TOP NOTIFICATION BELL
    // -----------------------------

    const bell =
        document.getElementById(
            "notificationBtn"
        );

    if (!bell) {
        console.warn(
            "notificationBtn not found"
        );
        return;
    }


    let badge =
        document.getElementById(
            "notificationBadge"
        );


    // Create badge if missing
    if (!badge) {

        badge =
            document.createElement("span");

        badge.id =
            "notificationBadge";

        badge.className =
            "notification-badge";

        bell.appendChild(badge);
    }


    // No unread messages
    if (teamChatUnreadCount <= 0) {

        badge.style.display =
            "none";

        badge.textContent =
            "";

        return;
    }


    // Show unread count
    badge.style.display =
        "flex";

    badge.textContent =
        teamChatUnreadCount > 99
            ? "99+"
            : String(
                teamChatUnreadCount
            );
}




// ---------------------------------------------------------
// REALTIME TEAM CHAT
// ---------------------------------------------------------

function setupTeamChatRealtime() {
    if (!currentUser || !supabaseClient) return;

    if (teamChatChannel) {
        supabaseClient.removeChannel(teamChatChannel);
        teamChatChannel = null;
    }

    teamChatChannel = supabaseClient
        .channel(`team-chat-${currentUser.id}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages"
            },
            async (payload) => {
                const newMessage = payload?.new;
                if (!newMessage) return;

                const isOwnMessage =
                    String(newMessage.sender_id) ===
                    String(currentUser.id);

                if (!teamChatProfiles[newMessage.sender_id]) {
                    const { data: profile, error } =
                        await supabaseClient
                            .from("user_profiles")
                            .select("id, full_name, role, avatar_url, avatar")
                            .eq("id", newMessage.sender_id)
                            .single();

                    if (error) {
                        console.warn("Sender profile loading error:", error);
                    }

                    if (profile) {
                        teamChatProfiles[profile.id] = profile;
                    }
                }

                if (document.getElementById("teamChatMessages")) {
                    await loadTeamChat();
                }

                if (!isOwnMessage) {

                    teamChatUnreadCount++;

                    updateTeamChatUnreadUI();

                }
            }
        )
        .subscribe((status) => {
            console.log("TEAM CHAT REALTIME STATUS:", status);
        } );
}

// ---------------------------------------------------------
// TEAM CHAT FORM
// ---------------------------------------------------------

document
    .getElementById("teamChatForm")
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await sendTeamChatMessage();

        }
    );


// ---------------------------------------------------------
// ENTER TO SEND
// SHIFT + ENTER = NEW LINE
// ---------------------------------------------------------

document
    .getElementById("teamChatInput")
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendTeamChatMessage();

            }

        }
    );


// ---------------------------------------------------------
// CHARACTER COUNTER
// ---------------------------------------------------------

document
    .getElementById("teamChatInput")
    ?.addEventListener(
        "input",
        updateChatCharacterCount
    );


// ---------------------------------------------------------
// LOAD CHAT WHEN OPENED
// ---------------------------------------------------------

document
    .querySelectorAll(".nav-item")
    .forEach(item => {

        item.addEventListener(
            "click",
            () => {

                if (
                    item.dataset.tab ===
                    "team-chat"
                ) {

                    teamChatIsOpen = true;

                    teamChatUnreadCount = 0;

                    updateTeamChatUnreadUI();


                    setTimeout(
                        async () => {

                            await loadTeamChat();

                            scrollTeamChatToBottom();

                        },
                        50
                    );

                }

            }
        );

    });


// ---------------------------------------------------------
// INITIAL TEAM CHAT
// ---------------------------------------------------------

async function initializeTeamChat() {
    if (!currentUser) return;

    teamChatIsOpen = isTeamChatOpen();
    await loadTeamChat();

    if (!teamChatChannel) {
        setupTeamChatRealtime();
    }
    updateTeamChatUnreadUI();
}


// ---------------------------------------------------------
// INITIALIZE AFTER AUTH
// ---------------------------------------------------------

if (
    typeof currentUser !== "undefined" &&
    currentUser
) {

initializeTeamChat().catch(err => console.error('initializeTeamChat error', err));

}

// ============================================================
// DESIGN AND CRAFT MART
// NOTIFICATION SYSTEM
// ============================================================

let notificationItems = [];
let notificationDropdownOpen = false;


// ============================================================
// NOTIFICATION ELEMENTS
// ============================================================

function getNotificationButton() {

    return document.querySelector(
        "#notificationBtn, .notification-btn, [data-notification-btn]"
    );

}


// ============================================================
// CREATE NOTIFICATION UI
// ============================================================

// ============================================================
// INITIALIZE NOTIFICATION UI
// ============================================================

function initializeNotificationUI() {

    const button =
        document.getElementById("notificationBtn");

    const panel =
        document.getElementById("notificationPanel");

    const markAllButton =
        document.getElementById(
            "markAllNotificationsRead"
        );

    if (!button) {
        console.warn(
            "Notification button #notificationBtn not found."
        );
        return;
    }

    if (!panel) {
        console.warn(
            "Notification panel #notificationPanel not found."
        );
        return;
    }

    // --------------------------------------------------------
    // Prevent duplicate event binding
    // --------------------------------------------------------

    if (
        button.dataset.notificationInitialized ===
        "true"
    ) {
        return;
    }

    button.dataset.notificationInitialized =
        "true";


    // --------------------------------------------------------
    // Accessibility
    // --------------------------------------------------------

    button.type = "button";

    button.setAttribute(
        "aria-label",
        "Notifications"
    );

    button.setAttribute(
        "aria-expanded",
        "false"
    );


    // --------------------------------------------------------
    // Initial panel state
    // --------------------------------------------------------

    panel.hidden = true;

    panel.classList.remove("show");

    panel.style.display = "none";

    panel.style.visibility = "hidden";

    panel.style.opacity = "0";

    panel.style.pointerEvents = "none";


    // --------------------------------------------------------
    // Bell click
    // --------------------------------------------------------

    button.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();
            event.stopPropagation();

            const isOpen =
                !panel.hidden &&
                notificationDropdownOpen;

            if (isOpen) {

                closeNotificationPanel();

                return;

            }


            // Open

            notificationDropdownOpen =
                true;

            panel.hidden = false;

            panel.classList.add("show");

            panel.style.display = "block";

            panel.style.visibility = "visible";

            panel.style.opacity = "1";

            panel.style.pointerEvents = "auto";

            button.setAttribute(
                "aria-expanded",
                "true"
            );


            // Load latest notifications

            await loadNotifications();

        }
    );


    // --------------------------------------------------------
    // Mark all as read
    // --------------------------------------------------------

    if (markAllButton) {

        markAllButton.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();

                event.stopPropagation();

                await markAllNotificationsRead();

            }
        );

    }


    // --------------------------------------------------------
    // Click outside = close
    // --------------------------------------------------------

    document.addEventListener(
        "click",
        function (event) {

            if (
                panel.contains(event.target) ||
                button.contains(event.target)
            ) {

                return;

            }

            closeNotificationPanel();

        }
    );


    console.log(
        "Notification UI initialized successfully."
    );

}


// ============================================================
// CLOSE NOTIFICATION PANEL
// ============================================================

function closeNotificationPanel() {

    const panel =
        document.getElementById(
            "notificationPanel"
        );

    const button =
        getNotificationButton();


    notificationDropdownOpen = false;


    if (panel) {

        panel.classList.remove("show");

        panel.style.display = "none";
        panel.style.visibility = "hidden";
        panel.style.opacity = "0";
        panel.style.pointerEvents = "none";

    }


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );

    }

}


// ============================================================
// LOAD NOTIFICATIONS
// ============================================================

async function loadNotifications() {

    if (!currentUser) {
        return;
    }


    const list =
        document.getElementById(
            "notificationList"
        );


    if (!list) {
        return;
    }


    list.innerHTML = `

        <div class="notification-loading">

            Loading notifications...

        </div>

    `;


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("notifications")
                .select(`
                    id,
                    type,
                    title,
                    message,
                    link_tab,
                    related_id,
                    is_read,
                    created_at
                `)
                .eq(
                    "user_id",
                    currentUser.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(50);


        if (error) {

            throw error;

        }


        notificationItems =
            data || [];


        renderNotifications();

    }

    catch (error) {

        console.error(
            "Notification loading error:",
            error
        );


        list.innerHTML = `

            <div class="notification-error">

                <strong>
                    Unable to load notifications
                </strong>

                <span>
                    ${esc(
                        error.message ||
                        "Unknown error"
                    )}
                </span>

            </div>

        `;

    }

}


// ============================================================
// RENDER NOTIFICATIONS
// ============================================================

function renderNotifications() {

    const list =
        document.getElementById(
            "notificationList"
        );


    const countText =
        document.getElementById(
            "notificationCountText"
        );


    if (!list) {
        return;
    }


    const unreadCount =
        notificationItems.filter(
            item =>
                !item.is_read
        ).length;


    updateNotificationBadge(
        unreadCount
    );


    if (countText) {

        countText.textContent =
            notificationItems.length === 1
                ? "1 notification"
                : `${notificationItems.length} notifications`;

    }


    if (
        !notificationItems.length
    ) {

        list.innerHTML = `

            <div class="notification-empty">

                <div class="notification-empty-icon">
                    ◇
                </div>

                <strong>
                    You're all caught up
                </strong>

                <span>
                    New workspace notifications will appear here.
                </span>

            </div>

        `;

        return;

    }


    list.innerHTML =
        notificationItems
            .map(
                notification =>
                    createNotificationHTML(
                        notification
                    )
            )
            .join("");


    // --------------------------------------------------------
    // Notification click
    // --------------------------------------------------------

    list
        .querySelectorAll(
            "[data-notification-id]"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    async () => {

                        const id =
                            item.dataset
                                .notificationId;


                        await handleNotificationClick(
                            id
                        );

                    }
                );

            }
        );

}


// ============================================================
// NOTIFICATION HTML
// ============================================================

function createNotificationHTML(
    notification
) {

    const isUnread =
        !notification.is_read;


    const icon =
        getNotificationIcon(
            notification.type
        );


    const time =
        formatNotificationTime(
            notification.created_at
        );


    return `

        <button
            type="button"
            class="
                notification-item
                ${isUnread ? "unread" : ""}
            "
            data-notification-id="${esc(
                notification.id
            )}"
        >

            <span class="notification-item-icon">

                ${icon}

            </span>


            <span class="notification-item-content">

                <span class="notification-item-top">

                    <strong>
                        ${esc(
                            notification.title ||
                            "Notification"
                        )}
                    </strong>

                    ${
                        isUnread
                            ? `
                                <span
                                    class="notification-unread-dot"
                                ></span>
                            `
                            : ""
                    }

                </span>


                <span class="notification-item-message">

                    ${esc(
                        notification.message ||
                        ""
                    )}

                </span>


                <span class="notification-item-time">

                    ${esc(time)}

                </span>

            </span>

        </button>

    `;

}


// ============================================================
// NOTIFICATION ICON
// ============================================================

function getNotificationIcon(type) {

    const icons = {

        content:
            "✦",

        content_approved:
            "✓",

        content_rejected:
            "×",

        order:
            "▣",

        order_updated:
            "↻",

        partner:
            "♢",

        system:
            "◇",

        chat:
            "◌"

    };


    return icons[type] ||
        icons.system;

}


// ============================================================
// NOTIFICATION TIME
// ============================================================

function formatNotificationTime(
    dateValue
) {

    if (!dateValue) {
        return "";
    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const now =
        new Date();


    const seconds =
        Math.floor(
            (
                now.getTime() -
                date.getTime()
            ) / 1000
        );


    if (seconds < 60) {

        return "Just now";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `${minutes}m ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `${hours}h ago`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days < 7) {

        return `${days}d ago`;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ============================================================
// UPDATE NOTIFICATION BADGE
// ============================================================

function updateNotificationBadge(
    unreadCount
) {

    const button =
        getNotificationButton();


    if (!button) {
        return;
    }


    let badge =
        button.querySelector(
            ".notification-count"
        );


    // Remove old badge.

    if (
        unreadCount <= 0
    ) {

        if (badge) {

            badge.remove();

        }

        return;

    }


    // Create badge.

    if (!badge) {

        badge =
            document.createElement(
                "span"
            );

        badge.className =
            "notification-count";

        button.appendChild(
            badge
        );

    }


    badge.textContent =
        unreadCount > 99
            ? "99+"
            : String(
                unreadCount
            );

}


// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

async function markNotificationRead(
    notificationId
) {

    if (!currentUser) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("notifications")
            .update({
                is_read: true
            })
            .eq(
                "id",
                notificationId
            )
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "Mark notification read error:",
            error
        );

        return;

    }


    const notification =
        notificationItems.find(
            item =>
                String(item.id) ===
                String(notificationId)
        );


    if (notification) {

        notification.is_read =
            true;

    }


    renderNotifications();

}


// ============================================================
// MARK ALL READ
// ============================================================

async function markAllNotificationsRead() {

    if (!currentUser) {
        return;
    }


    const unread =
        notificationItems.filter(
            item =>
                !item.is_read
        );


    if (!unread.length) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("notifications")
            .update({
                is_read: true
            })
            .eq(
                "user_id",
                currentUser.id
            )
            .eq(
                "is_read",
                false
            );


    if (error) {

        console.error(
            "Mark all notifications read error:",
            error
        );


        alert(
            "Unable to mark notifications as read."
        );

        return;

    }


    notificationItems =
        notificationItems.map(
            item => ({
                ...item,
                is_read: true
            })
        );


    renderNotifications();

}


// ============================================================
// HANDLE NOTIFICATION CLICK
// ============================================================

async function handleNotificationClick(
    notificationId
) {

    const notification =
        notificationItems.find(
            item =>
                String(item.id) ===
                String(notificationId)
        );


    if (!notification) {
        return;
    }


    if (!notification.is_read) {

        await markNotificationRead(
            notification.id
        );

    }


    closeNotificationPanel();


    // Navigate to related tab.

    if (
        notification.link_tab
    ) {

        const targetTab =
            document.querySelector(
                `.nav-item[data-tab="${CSS.escape(
                    notification.link_tab
                )}"]`
            );


        if (targetTab) {

            showTab(
                notification.link_tab
            );

        }

    }

}


// ============================================================
// CREATE NOTIFICATION
// ============================================================

async function createNotification({
    userId,
    type = "system",
    title,
    message,
    linkTab = null,
    relatedId = null
}) {

    if (!userId) {

        console.warn(
            "Notification skipped: missing userId."
        );

        return null;

    }


    if (!title || !message) {

        console.warn(
            "Notification skipped: title/message missing."
        );

        return null;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("notifications")
            .insert({

                user_id:
                    userId,

                type:
                    type,

                title:
                    title,

                message:
                    message,

                link_tab:
                    linkTab,

                related_id:
                    relatedId,

                is_read:
                    false

            })
            .select()
            .single();


    if (error) {

        console.error(
            "Notification creation error:",
            error
        );

        return null;

    }


    return data;

}


// ============================================================
// NOTIFICATION REALTIME
// ============================================================

function setupNotificationRealtime() {

    if (
        !currentUser ||
        typeof supabaseClient ===
            "undefined"
    ) {

        return;

    }


    // Remove previous channel.

    if (
        notificationChannel
    ) {

        supabaseClient
            .removeChannel(
                notificationChannel
            );

        notificationChannel =
            null;

    }


    notificationChannel =
        supabaseClient
            .channel(
                `notifications-${currentUser.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter:
                        `user_id=eq.${currentUser.id}`
                },
                async payload => {

                    if (
                        !payload.new
                    ) {

                        return;

                    }


                    // Add notification immediately.

                    notificationItems =
                        [
                            payload.new,
                            ...notificationItems
                        ];


                    // Keep max 50.

                    notificationItems =
                        notificationItems.slice(
                            0,
                            50
                        );


                    renderNotifications();


                    // If dropdown is open, refresh it.

                    if (
                        notificationDropdownOpen
                    ) {

                        await loadNotifications();

                    }

                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter:
                        `user_id=eq.${currentUser.id}`
                },
                async payload => {

                    if (
                        !payload.new
                    ) {

                        return;

                    }


                    const index =
                        notificationItems.findIndex(
                            item =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    payload.new.id
                                )
                        );


                    if (index !== -1) {

                        notificationItems[
                            index
                        ] =
                            payload.new;

                    }


                    renderNotifications();

                }
            )
            .subscribe(
                status => {

                    console.log(
                        "Notifications realtime:",
                        status
                    );

                }
            );

}


// ============================================================
// INITIALIZE NOTIFICATIONS
// ============================================================

async function initializeNotifications() {

    if (!currentUser) {
        return;
    }


    initializeNotificationUI();


    await loadNotifications();


    setupNotificationRealtime();

}


// ============================================================
// START NOTIFICATION SYSTEM
// ============================================================

setTimeout(
    () => {

        initializeNotifications();

    },
    100
);


// ============================================================
// CLEANUP ON PAGE UNLOAD
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            notificationChannel
        ) {

            supabaseClient
                .removeChannel(
                    notificationChannel
                );

            notificationChannel =
                null;

        }

    }
);


/* =========================================================
   BUSINESS CARD FLIP
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const card = document.getElementById("businessCard");
    const flipButton = document.getElementById("flipCardBtn");

    if (!card || !flipButton) return;


    function flipBusinessCard() {

        card.classList.toggle("is-flipped");

        const flipped =
            card.classList.contains("is-flipped");

        flipButton.innerHTML = flipped
            ? "<span>↻</span> Front"
            : "<span>↻</span> Flip Card";
    }


    flipButton.addEventListener(
        "click",
        flipBusinessCard
    );


    /* click directly on card */

    card.addEventListener("click", () => {
        flipBusinessCard();
    });

});

/* =========================================================
   FINAL BUSINESS CARD RENDERER
========================================================= */

function renderBusinessCard(profile) {

    if (!profile) return;

    const name =
        profile.full_name ||
        "Partner";

    const role =
        profile.position ||
        profile.job_title ||
        profile.role ||
        "Partner";

    const phone =
        profile.mobile ||
        "";

    const email =
        currentUser?.email ||
        profile.email ||
        "";

    const website =
        profile.website ||
        profile.website_url ||
        profile.web_url ||
        "";

    const nameEl =
        document.getElementById("cardPersonName");

    const roleEl =
        document.getElementById("cardPersonRole");

    const phoneEl =
        document.getElementById("cardPhone");

    const phoneRow =
        document.getElementById("cardPhoneRow");

    const emailEl =
        document.getElementById("cardEmail");

    const emailRow =
        document.getElementById("cardEmailRow");

    const websiteEl =
        document.getElementById("cardWebsite");

    const websiteRow =
        document.getElementById("cardWebsiteRow");


    /* NAME */

    if (nameEl) {
        nameEl.textContent = name;
    }


    /* POSITION */

    if (roleEl) {
        roleEl.textContent = role;
    }


    /* PHONE */

    if (phoneEl) {
        phoneEl.textContent = phone;
    }

    if (phoneRow) {
        phoneRow.classList.toggle(
            "is-hidden",
            !phone
        );
    }


    /* EMAIL */

    if (emailEl) {
        emailEl.textContent = email;
    }

    if (emailRow) {
        emailRow.classList.toggle(
            "is-hidden",
            !email
        );
    }


    /* WEBSITE */

    if (websiteEl) {
        websiteEl.textContent = website;
    }

    if (websiteRow) {
        websiteRow.classList.toggle(
            "is-hidden",
            !website
        );
    }
}

function toggleBusinessCardFlip() {
    const card = document.querySelector('.business-card');

    if (!card) {
        console.warn('Business card element not found.');
        return;
    }

    card.classList.toggle('flipped');
}

// ============================================================
// BUSINESS CARD FLIP FIX
// ============================================================

window.toggleBusinessCardFlip = function () {

    const card = document.getElementById("businessCard");
    const button = document.getElementById("flipCardBtn");

    if (!card) return;

    card.classList.toggle("is-flipped");

    const flipped =
        card.classList.contains("is-flipped");

    if (button) {

        button.innerHTML = flipped
            ? '<span>↻</span> Front'
            : '<span>↻</span> Flip Card';

    }

};

function setupMobileNavigation() {

    const menuButton =
        document.getElementById("mobileMenuBtn");

    const menuClose =
        document.getElementById("mobileMenuClose");

    const overlay =
        document.getElementById("mobileMenuOverlay");

    const mobileMenu =
        document.getElementById("mobileMenu");

    if (!menuButton || !menuClose || !overlay || !mobileMenu) {
        return;
    }

    function openMenu() {

        document.body.classList.add("mobile-menu-open");

        menuButton.setAttribute("aria-expanded", "true");

        mobileMenu.setAttribute("aria-hidden", "false");
        overlay.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {

        document.body.classList.remove("mobile-menu-open");

        menuButton.setAttribute("aria-expanded", "false");

        mobileMenu.setAttribute("aria-hidden", "true");
        overlay.setAttribute("aria-hidden", "true");
    }

    menuButton.addEventListener("click", openMenu);

    menuClose.addEventListener("click", closeMenu);

    overlay.addEventListener("click", closeMenu);


    document
        .querySelectorAll(".mobile-nav .nav-item")
        .forEach(item => {

            item.addEventListener("click", () => {

                const tab =
                    item.getAttribute("data-tab");

                /*
                 * IMPORTANT:
                 * Use the existing desktop nav item.
                 * This prevents us from creating a second
                 * tab-switching system.
                 */
                const desktopItem =
                    document.querySelector(
                        `.sidebar-nav .nav-item[data-tab="${tab}"]`
                    );

                if (desktopItem) {
                    desktopItem.click();
                }

                closeMenu();

            });

        });


    const mobileLogout =
        document.getElementById("mobileLogoutBtn");

    if (mobileLogout) {

        mobileLogout.addEventListener("click", () => {

            const desktopLogout =
                document.querySelector(".logout-link");

            if (desktopLogout) {
                desktopLogout.click();
            }

        });

    }

}

// ============================================================
// MOBILE MENU
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const menuBtn = document.getElementById("mobileMenuBtn");
    const menu = document.getElementById("mobileMenu");
    const closeBtn = document.getElementById("mobileMenuClose");
    const overlay = document.getElementById("mobileMenuOverlay");

    if (!menuBtn || !menu) {
        console.error("Mobile menu elements not found.");
        return;
    }

    function openMobileMenu() {
        document.body.classList.add("mobile-menu-open");

        menu.setAttribute("aria-hidden", "false");

        if (overlay) {
            overlay.setAttribute("aria-hidden", "false");
        }

        menuBtn.setAttribute("aria-expanded", "true");
    }

    function closeMobileMenu() {
        document.body.classList.remove("mobile-menu-open");

        menu.setAttribute("aria-hidden", "true");

        if (overlay) {
            overlay.setAttribute("aria-hidden", "true");
        }

        menuBtn.setAttribute("aria-expanded", "false");
    }

    menuBtn.addEventListener("click", openMobileMenu);

    if (closeBtn) {
        closeBtn.addEventListener("click", closeMobileMenu);
    }

    if (overlay) {
        overlay.addEventListener("click", closeMobileMenu);
    }


    // Mobile navigation
    document.querySelectorAll(".mobile-nav .nav-item").forEach(item => {

        item.addEventListener("click", () => {

            const tabName = item.dataset.tab;

            // Find the existing desktop navigation item
            const desktopItem = document.querySelector(
                `.sidebar .nav-item[data-tab="${tabName}"]`
            );

            if (desktopItem) {
                desktopItem.click();
            } else {
                console.warn(
                    "Desktop navigation item not found:",
                    tabName
                );
            }

            closeMobileMenu();
        });

    });


    // Mobile logout
    const mobileLogout =
        document.getElementById("mobileLogoutBtn");

    if (mobileLogout) {

        mobileLogout.addEventListener("click", () => {

            const desktopLogout =
                document.getElementById("logoutBtn");

            if (desktopLogout) {
                desktopLogout.click();
            }

        });

    }

});

document.addEventListener("DOMContentLoaded", function () {

    const menuBtn = document.getElementById("mobileMenuBtn");
    const menu = document.getElementById("mobileMenu");
    const closeBtn = document.getElementById("mobileMenuClose");
    const overlay = document.getElementById("mobileMenuOverlay");

    if (!menuBtn || !menu) {
        console.error("Mobile menu HTML not found.");
        return;
    }

    function openMobileMenu() {
        document.body.classList.add("mobile-menu-open");
        menuBtn.setAttribute("aria-expanded", "true");
    }

    function closeMobileMenu() {
        document.body.classList.remove("mobile-menu-open");
        menuBtn.setAttribute("aria-expanded", "false");
    }

    menuBtn.addEventListener("click", openMobileMenu);

    if (closeBtn) {
        closeBtn.addEventListener("click", closeMobileMenu);
    }

    if (overlay) {
        overlay.addEventListener("click", closeMobileMenu);
    }

    document.querySelectorAll(".mobile-nav .nav-item").forEach(item => {

        item.addEventListener("click", function () {

            const tab = this.dataset.tab;

            const desktopItem =
                document.querySelector(
                    `.sidebar .nav-item[data-tab="${tab}"]`
                );

            if (desktopItem) {
                desktopItem.click();
            }

            closeMobileMenu();
        });

    });

});


// ============================================================
// MOBILE NAVIGATION
// PHASE 1
// ============================================================

(function setupMobileNavigation() {

    const menuBtn =
        document.getElementById("mobileMenuBtn");

    const menu =
        document.getElementById("mobileMenu");

    const overlay =
        document.getElementById("mobileMenuOverlay");

    const closeBtn =
        document.getElementById("mobileMenuClose");

    const mobileLogout =
        document.getElementById("mobileLogoutBtn");

    if (!menuBtn || !menu || !overlay) {
        console.warn(
            "Mobile navigation elements not found."
        );

        return;
    }


    function openMobileMenu() {

        document.body.classList.add(
            "mobile-menu-open"
        );

        menuBtn.setAttribute(
            "aria-expanded",
            "true"
        );

        menu.setAttribute(
            "aria-hidden",
            "false"
        );

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    function closeMobileMenu() {

        document.body.classList.remove(
            "mobile-menu-open"
        );

        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );

        menu.setAttribute(
            "aria-hidden",
            "true"
        );

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    menuBtn.addEventListener(
        "click",
        openMobileMenu
    );


    closeBtn?.addEventListener(
        "click",
        closeMobileMenu
    );


    overlay.addEventListener(
        "click",
        closeMobileMenu
    );


    // --------------------------------------------------------
    // Mobile navigation tabs
    // --------------------------------------------------------

    menu
        .querySelectorAll(".nav-item[data-tab]")
        .forEach((item) => {

            item.addEventListener(
                "click",
                () => {

                    const tab =
                        item.dataset.tab;

                    if (!tab) {
                        return;
                    }


                    // Use the existing desktop navigation
                    // so both navigation systems stay synchronized.

                    const desktopItem =
                        document.querySelector(
                            `.sidebar .nav-item[data-tab="${tab}"]`
                        );


                    if (desktopItem) {

                        desktopItem.click();

                    } else {

                        // Fallback for tabs that may not
                        // currently have a desktop nav item.

                        const target =
                            document.getElementById(
                                `tab-${tab}`
                            );

                        if (target) {

                            document
                                .querySelectorAll(
                                    "[id^='tab-']"
                                )
                                .forEach(
                                    (section) => {
                                        section.style.display =
                                            "none";
                                    }
                                );

                            target.style.display =
                                "block";
                        }

                    }


                    // Update mobile active state

                    menu
                        .querySelectorAll(
                            ".nav-item[data-tab]"
                        )
                        .forEach(
                            (nav) => {
                                nav.classList.toggle(
                                    "active",
                                    nav.dataset.tab === tab
                                );
                            }
                        );


                    closeMobileMenu();

                }
            );

        });


    // --------------------------------------------------------
    // Mobile logout
    // --------------------------------------------------------

    mobileLogout?.addEventListener(
        "click",
        async () => {

            try {

                if (
                    typeof supabaseClient !==
                    "undefined"
                ) {

                    await supabaseClient
                        .auth
                        .signOut();

                }

            } catch (error) {

                console.error(
                    "Mobile logout error:",
                    error
                );

            } finally {

                window.location.href =
                    "index.html";

            }

        }
    );


    // --------------------------------------------------------
    // Escape key
    // --------------------------------------------------------

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                document.body.classList.contains(
                    "mobile-menu-open"
                )
            ) {

                closeMobileMenu();

            }

        }
    );


    // --------------------------------------------------------
    // Close menu when resizing back to desktop
    // --------------------------------------------------------

    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth > 950
            ) {

                closeMobileMenu();

            }

        }
    );


})();