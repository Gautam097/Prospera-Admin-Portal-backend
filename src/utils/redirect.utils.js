export function getRedirectUrl(baseUrl, route) {
    if (!baseUrl.endsWith('/') && !route.startsWith('/')) {
        return `${baseUrl}/${route}`;
    }
    if (baseUrl.endsWith('/') && route.startsWith('/')) {
        return `${baseUrl}${route.slice(1)}`;
    }
    return `${baseUrl}${route}`;
}
