(function () {
    "use strict";

    function initNavigationFix() {

        /* =====================================================
           REMOVE DUPLICATE MOBILE MENU
        ===================================================== */

        const mobileMenus = [
            ...document.querySelectorAll("aside.mobile-menu")
        ];

        // Keep the FIRST menu — it uses the real data-tab system.
        if (mobileMenus.length > 1) {
            mobileMenus.slice(1).forEach(menu => menu.remove());
        }


        /* =====================================================
           REMOVE DUPLICATE OVERLAY
        ===================================================== */

        const overlays = [
            ...document.querySelectorAll(".mobile-menu-overlay")
        ];

        if (overlays.length > 1) {
            overlays.slice(1).forEach(overlay => overlay.remove());
        }


        /* =====================================================
           ORIGINAL MOBILE MENU
        ===================================================== */

        const menu =
            document.getElementById("mobileMenu");

        const menuButton =
            document.getElementById("mobileMenuBtn");

        const closeButton =
            document.getElementById("mobileMenuClose");

        const overlay =
            document.getElementById("mobileMenuOverlay");


        if (!menu) {
            console.error(
                "Navigation fix: mobile menu not found."
            );

            return;
        }


        /* =====================================================
           OPEN / CLOSE
        ===================================================== */

        function openMenu() {

            document.body.classList.add(
                "mobile-menu-open"
            );

            menu.setAttribute(
                "aria-hidden",
                "false"
            );

            menuButton?.setAttribute(
                "aria-expanded",
                "true"
            );

            overlay?.setAttribute(
                "aria-hidden",
                "false"
            );
        }


        function closeMenu() {

            document.body.classList.remove(
                "mobile-menu-open"
            );

            menu.setAttribute(
                "aria-hidden",
                "true"
            );

            menuButton?.setAttribute(
                "aria-expanded",
                "false"
            );

            overlay?.setAttribute(
                "aria-hidden",
                "true"
            );
        }


        menuButton?.addEventListener(
            "click",
            openMenu
        );


        closeButton?.addEventListener(
            "click",
            closeMenu
        );


        overlay?.addEventListener(
            "click",
            closeMenu
        );


        /* =====================================================
           MOBILE NAVIGATION
        ===================================================== */

        menu
            .querySelectorAll(
                ".nav-item[data-tab]"
            )
            .forEach(item => {

                /*
                 * Clone the item so old duplicate
                 * mobile listeners are removed.
                 */

                const cleanItem =
                    item.cloneNode(true);

                item.replaceWith(
                    cleanItem
                );


                cleanItem.addEventListener(
                    "click",
                    function () {

                        const tab =
                            this.dataset.tab;

                        if (!tab) {
                            return;
                        }


                        /*
                         * IMPORTANT:
                         * Use the EXISTING application
                         * navigation system.
                         */

                        const desktopItem =
                            document.querySelector(
                                `.sidebar-nav .nav-item[data-tab="${CSS.escape(tab)}"]`
                            );


                        if (desktopItem) {

                            desktopItem.click();

                        } else {

                            console.warn(
                                "Navigation target not found:",
                                tab
                            );

                        }


                        /* Update mobile active state */

                        menu
                            .querySelectorAll(
                                ".nav-item[data-tab]"
                            )
                            .forEach(nav => {

                                nav.classList.toggle(
                                    "active",
                                    nav.dataset.tab === tab
                                );

                            });


                        closeMenu();

                    }
                );

            });


        /* =====================================================
           DESKTOP → MOBILE ACTIVE STATE
        ===================================================== */

        document
            .querySelectorAll(
                ".sidebar-nav .nav-item[data-tab]"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        const tab =
                            item.dataset.tab;


                        menu
                            .querySelectorAll(
                                ".nav-item[data-tab]"
                            )
                            .forEach(nav => {

                                nav.classList.toggle(
                                    "active",
                                    nav.dataset.tab === tab
                                );

                            });


                        closeMenu();

                    }
                );

            });


        /* =====================================================
           MOBILE LOGOUT
        ===================================================== */

        document
            .getElementById(
                "mobileLogoutBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "logoutBtn"
                        )
                        ?.click();

                }
            );


        /* =====================================================
           ESCAPE
        ===================================================== */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeMenu();

                }

            }
        );


        console.log(
            "Navigation fix initialized."
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initNavigationFix,
            { once: true }
        );

    } else {

        initNavigationFix();

    }

})();