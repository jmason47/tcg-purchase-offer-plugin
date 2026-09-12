export default defineNuxtRouteMiddleware(to => {
  const user = useSupabaseUser();
  if (!user.value && to.path !== "/admin/login") {
    return navigateTo({ path: "/admin/login", query: { redirect: to.fullPath } });
  }
});
