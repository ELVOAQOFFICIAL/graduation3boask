'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Mail, KeyRound, Loader2, HelpCircle, Lock } from 'lucide-react';
import Turnstile from '@/components/Turnstile';

export default function LoginPage() {
	const router = useRouter();
	const [layer, setLayer] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [turnstileToken, setTurnstileToken] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [otpSent, setOtpSent] = useState(false);
	const [otp, setOtp] = useState('');
	const [isTwoFactorLogin, setIsTwoFactorLogin] = useState(false);
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const onTurnstileVerify = useCallback((token: string) => {
		setTurnstileToken(token);
	}, []);

	const onTurnstileExpire = useCallback(() => {
		setTurnstileToken('');
	}, []);

	const handleLayer1 = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/layer1', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, turnstileToken }),
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error);
				return;
			}

			if (data.sessionReady) {
				router.push('/dashboard');
				return;
			}

			if (data.requiresTwoFactor) {
				setIsTwoFactorLogin(true);
				setOtpSent(true);
				setEmail(data.maskedEmail || '');
				setLayer(3);
				return;
			}

			setIsTwoFactorLogin(false);
			setTurnstileToken('');
			setLayer(data.nextLayer);
		} catch {
			setError('Chyba pripojenia. Skuste znova.');
		} finally {
			setLoading(false);
		}
	};

	const handleLayer2 = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/layer2', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName, lastName, turnstileToken }),
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error);
				return;
			}

			setTurnstileToken('');
			setLayer(data.nextLayer);
		} catch {
			setError('Chyba pripojenia. Skuste znova.');
		} finally {
			setLoading(false);
		}
	};

	const handleRequestOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/layer3/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, turnstileToken }),
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error);
				return;
			}

			setOtpSent(true);
		} catch {
			setError('Chyba pripojenia. Skuste znova.');
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/layer3/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: otp }),
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error);
				return;
			}

			if (data.needsPasswordSetup) {
				setLayer(4);
				return;
			}

			router.push('/dashboard');
		} catch {
			setError('Chyba pripojenia. Skuste znova.');
		} finally {
			setLoading(false);
		}
	};

	const handleSetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/password/set', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: newPassword, confirmPassword }),
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error);
				return;
			}

			router.push('/dashboard');
		} catch {
			setError('Chyba pripojenia. Skuste znova.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-white mb-2">Stuzkova</h1>
					<p className="text-zinc-400">Ziadosti o piesne</p>
				</div>

				<div className="flex items-center justify-center gap-2 mb-8">
					{[1, 2, 3, 4].map((step) => (
						<div key={step} className="flex items-center gap-2">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									step < layer
										? 'bg-indigo-500 text-white'
										: step === layer
										? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500'
										: 'bg-zinc-800 text-zinc-500 border border-zinc-700'
								}`}
							>
								{step}
							</div>
							{step < 4 && (
								<div className={`w-6 h-0.5 ${step < layer ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
							)}
						</div>
					))}
				</div>

				<div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
					{error && (
						<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
							<p className="text-red-400 text-sm">{error}</p>
						</div>
					)}

					{layer === 1 && (
						<form onSubmit={handleLayer1}>
							<div className="flex items-center gap-2 mb-4">
								<KeyRound className="w-5 h-5 text-indigo-400" />
								<h2 className="text-lg font-semibold">Prihlasenie</h2>
							</div>
							<p className="text-zinc-400 text-sm mb-4">
								Zadajte svoje pouzivatelske meno. Ak sa prihlasujete prvykrat, heslo nechajte prazdne — nastavite si ho po overeni uctu.
							</p>

							<div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 mb-4 text-sm">
								<p className="text-indigo-300 font-medium mb-1">Format pouzivatelskeho mena</p>
								<p className="text-zinc-400">Meno a priezvisko spolu, bez medzier, bez diakritiky, malymi pismenami.</p>
								<p className="text-zinc-500 mt-1">Priklad: <span className="text-white font-mono">Jan Novak → jannovak</span></p>
							</div>

							<div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4 text-sm">
								<p className="text-amber-300 font-medium mb-1">Ako funguje prihlasenie?</p>
								<p className="text-zinc-400 mb-1"><span className="text-white font-medium">Prvy raz:</span> Zadajte len pouzivatelske meno (bez hesla). Po overeni vasej totoznosti a emailu si nastavite vlastne heslo.</p>
								<p className="text-zinc-400"><span className="text-white font-medium">Pri navrate:</span> Zadajte pouzivatelske meno aj heslo, ktore ste si nastavili pri prvom prihlaseni.</p>
							</div>

							<div className="space-y-3">
								<div>
									<label className="block text-sm text-zinc-400 mb-1">Pouzivatelske meno</label>
									<input
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
										required
										autoComplete="username"
									/>
								</div>
								<div>
									<label className="block text-sm text-zinc-400 mb-1">Heslo <span className="text-zinc-500">(len ak uz mate ucet nastaveny)</span></label>
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
										autoComplete="current-password"
									/>
								</div>
							</div>

							<Turnstile onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} />

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
							>
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
								Pokracovat
							</button>
						</form>
					)}

					{layer === 2 && (
						<form onSubmit={handleLayer2}>
							<div className="flex items-center gap-2 mb-4">
								<User className="w-5 h-5 text-indigo-400" />
								<h2 className="text-lg font-semibold">Overenie totoznosti</h2>
							</div>
							<p className="text-zinc-400 text-sm mb-4">Zadajte svoje meno a priezvisko pre potvrdenie totoznosti.</p>

							<div className="space-y-3">
								<div>
									<label className="block text-sm text-zinc-400 mb-1">Meno</label>
									<input
										type="text"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
										required
									/>
								</div>
								<div>
									<label className="block text-sm text-zinc-400 mb-1">Priezvisko</label>
									<input
										type="text"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
										required
									/>
								</div>
							</div>

							<Turnstile onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} />

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
							>
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
								Overit
							</button>
						</form>
					)}

					{layer === 3 && !otpSent && (
						<form onSubmit={handleRequestOtp}>
							<div className="flex items-center gap-2 mb-4">
								<Mail className="w-5 h-5 text-indigo-400" />
								<h2 className="text-lg font-semibold">Emailove overenie</h2>
							</div>
							<p className="text-zinc-400 text-sm mb-4">Zadajte svoj email. Posleme vam 6-miestny overovaci kod.</p>

							<div>
								<label className="block text-sm text-zinc-400 mb-1">Emailova adresa</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
									required
									autoComplete="email"
								/>
							</div>

							<Turnstile onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} />

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
							>
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
								Odoslat kod
							</button>
						</form>
					)}

					{layer === 3 && otpSent && (
						<form onSubmit={handleVerifyOtp}>
							<div className="flex items-center gap-2 mb-4">
								<KeyRound className="w-5 h-5 text-indigo-400" />
								<h2 className="text-lg font-semibold">{isTwoFactorLogin ? '2FA overenie' : 'Zadajte overovaci kod'}</h2>
							</div>
							<p className="text-zinc-400 text-sm mb-4">
								{isTwoFactorLogin
									? <>2FA kod bol odoslany na <span className="text-white">{email}</span>.</>
									: <>Overovaci kod bol odoslany na <span className="text-white">{email}</span>.</>}
							</p>

							<div>
								<label className="block text-sm text-zinc-400 mb-1">6-miestny kod</label>
								<input
									type="text"
									value={otp}
									onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
									className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-indigo-500"
									maxLength={6}
									required
									autoComplete="one-time-code"
									inputMode="numeric"
								/>
							</div>

							<button
								type="submit"
								disabled={loading || otp.length !== 6}
								className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
							>
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
								Overit a pokracovat
							</button>

							{!isTwoFactorLogin && (
								<button
									type="button"
									onClick={() => {
										setOtpSent(false);
										setOtp('');
										setError('');
									}}
									className="w-full text-zinc-400 hover:text-white text-sm mt-3"
								>
									Odoslat kod znova
								</button>
							)}
						</form>
					)}

					{layer === 4 && (
						<form onSubmit={handleSetPassword}>
							<div className="flex items-center gap-2 mb-4">
								<Lock className="w-5 h-5 text-indigo-400" />
								<h2 className="text-lg font-semibold">Nastavenie hesla</h2>
							</div>
							<p className="text-zinc-400 text-sm mb-2">Nastavte si vlastne heslo. Toto heslo budete pouzivat pri kazdom dalsom prihlaseni spolu s vasim pouzivatelskym menom.</p>
							<div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-4 text-sm">
								<p className="text-green-300 font-medium mb-1">Zapamätajte si heslo!</p>
								<p className="text-zinc-400">Pri nasledujucom prihlaseni zadajte svoje pouzivatelske meno a toto heslo. Uz nebudete musiet overovat totoznost ani email.</p>
							</div>

							<div className="space-y-3">
								<div>
									<label className="block text-sm text-zinc-400 mb-1">Nove heslo</label>
									<input
										type="password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
										required
										minLength={8}
										autoComplete="new-password"
									/>
								</div>
								<div>
									<label className="block text-sm text-zinc-400 mb-1">Potvrdte heslo</label>
									<input
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
										required
										minLength={8}
										autoComplete="new-password"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
							>
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
								Ulozit heslo a vstupit
							</button>
						</form>
					)}
				</div>

				<div className="text-center mt-6 space-y-3">
					<a href="mailto:lukasrajnic@elvoaq.com" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm">
						<HelpCircle className="w-4 h-4" />
						Potrebujete pomoc? Kontaktujte spravcu
					</a>
					<p className="text-zinc-600 text-xs">Elvoaq AG · graduation3boask.elvoaq.com</p>
				</div>
			</div>
		</div>
	);
}
