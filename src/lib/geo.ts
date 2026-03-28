export async function getGeoInfo(ip: string): Promise<{ countryCode: string; city: string } | null> {
  if (ip === '127.0.0.1' || ip === '::1') {
    return { countryCode: 'SK', city: 'localhost' };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,city`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (data.status === 'success') {
      return { countryCode: data.countryCode, city: data.city };
    }
    return null;
  } catch {
    return null;
  }
}

export function isOutsideSlovakia(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return countryCode !== 'SK';
}
