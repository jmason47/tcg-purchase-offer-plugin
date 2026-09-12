export default defineNuxtRouteMiddleware(async to => {
  const user = useSupabaseUser();
  if (to.path === "/admin/login") {
    return;
  }

  if (!user.value) {
    return navigateTo({ path: "/admin/login", query: { redirect: to.fullPath } });
  }

  try {
    await $fetch("/api/admin/access", {
      credentials: "include",
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    });
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 403) {
      return navigateTo("/");
    }

    if (status === 401) {
      return navigateTo({ path: "/admin/login", query: { redirect: to.fullPath } });
    }

    throw error;
  }
});
