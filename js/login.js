// ============================================================
// DCM PARTNER HUB - LOGIN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const loginError = document.getElementById("loginError");
    const forgotPassword = document.getElementById("forgotPassword");


    // --------------------------------------------------------
    // Make sure Supabase is available
    // --------------------------------------------------------

    if (!window.supabase) {
        console.error("Supabase library was not loaded.");
        showError("Supabase could not be loaded. Please refresh the page.");
        return;
    }

    if (typeof supabaseClient === "undefined") {
        console.error("supabaseClient is not defined.");
        showError("Supabase configuration is missing.");
        return;
    }


    // --------------------------------------------------------
    // LOGIN FORM
    // --------------------------------------------------------

    loginForm?.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email =
            document
                .getElementById("loginEmail")
                ?.value
                .trim();


        const password =
            document
                .getElementById("loginPassword")
                ?.value;


        const rememberMe =
            document.getElementById("rememberMe")?.checked;


        clearError();


        if (!email || !password) {
            showError("Please enter your email and password.");
            return;
        }


        // ----------------------------------------------------
        // Loading state
        // ----------------------------------------------------

        if (loginBtn) {
            loginBtn.disabled = true;

            loginBtn.innerHTML = `
                <span>Signing In...</span>
                <span class="arrow">→</span>
            `;
        }


        try {

            // ------------------------------------------------
            // Supabase login
            // ------------------------------------------------

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });


            if (error) {
                throw error;
            }


            if (!data || !data.user) {
                throw new Error("Login failed. User information was not returned.");
            }


            // ------------------------------------------------
            // Check profile
            // ------------------------------------------------

            const { data: profile, error: profileError } =
                await supabaseClient
                    .from("user_profiles")
                    .select("*")
                    .eq("id", data.user.id)
                    .single();


            if (profileError) {

                console.error(
                    "Profile lookup error:",
                    profileError
                );

                await supabaseClient.auth.signOut();

                throw new Error(
                    "Your account exists, but your partner profile could not be found."
                );
            }


            // ------------------------------------------------
            // Check account approval
            // ------------------------------------------------

            if (!profile) {

                await supabaseClient.auth.signOut();

                throw new Error(
                    "Your partner profile could not be found."
                );
            }


            if (profile.status !== "approved") {

                await supabaseClient.auth.signOut();

                if (profile.status === "pending") {

                    throw new Error(
                        "Your account is still waiting for admin approval."
                    );

                }

                if (profile.status === "rejected") {

                    throw new Error(
                        "Your partner request has been rejected."
                    );
                }

                throw new Error(
                    "Your account is not approved yet."
                );
            }


            // ------------------------------------------------
            // Remember me
            // ------------------------------------------------
            //
            // Supabase stores the session automatically.
            // The checkbox is retained for UI compatibility.
            //
            // ------------------------------------------------


            console.log("Login successful:", data.user.email);


            // ------------------------------------------------
            // Redirect
            // ------------------------------------------------

            window.location.href = "app.html";

        }

        catch (error) {

            console.error("LOGIN ERROR:", error);

            showError(
                error?.message ||
                "Unable to sign in. Please try again."
            );

        }

        finally {

            if (loginBtn) {

                loginBtn.disabled = false;

                loginBtn.innerHTML = `
                    <span>Sign In</span>
                    <span class="arrow">→</span>
                `;

            }

        }

    });


    // --------------------------------------------------------
    // FORGOT PASSWORD
    // --------------------------------------------------------

    forgotPassword?.addEventListener("click", async (event) => {

        event.preventDefault();


        const email =
            document
                .getElementById("loginEmail")
                ?.value
                .trim();


        clearError();


        if (!email) {

            showError(
                "Enter your email address first, then click Forgot password."
            );

            return;
        }


        try {

            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            window.location.origin +
                            "/reset-password.html"
                    }
                );


            if (error) {
                throw error;
            }


            showSuccess(
                "Password reset instructions have been sent to your email."
            );

        }

        catch (error) {

            console.error(
                "PASSWORD RESET ERROR:",
                error
            );

            showError(
                error?.message ||
                "Unable to send password reset email."
            );

        }

    });


    // --------------------------------------------------------
    // ERROR MESSAGE
    // --------------------------------------------------------

    function showError(message) {

        if (!loginError) {
            alert(message);
            return;
        }


        loginError.textContent = message;

        loginError.style.display = "block";

    }


    // --------------------------------------------------------
    // SUCCESS MESSAGE
    // --------------------------------------------------------

    function showSuccess(message) {

        if (!loginError) {
            alert(message);
            return;
        }


        loginError.textContent = message;

        loginError.style.display = "block";

        loginError.classList.add("success");

    }


    // --------------------------------------------------------
    // CLEAR ERROR
    // --------------------------------------------------------

    function clearError() {

        if (!loginError) {
            return;
        }


        loginError.textContent = "";

        loginError.style.display = "none";

        loginError.classList.remove("success");

    }

});