This folder (cipherdocs/chrome/content/core) should contain the cipherdocs.jar file, the application 
core; and :

	*the bcprov-146.jar file, a copy of the Bouncy Castle cryptographic library used by the core. 
	*the bcmail-146.jar, a copy of a supporting BouncyCastle library(for S/MIME functionality).
	*folders that contain the unlimited strength Java cryptography files, for automatic installation.
	
Local files such as a debugging log file and user data files(settings, local storage) will be created here:

	*cipherdocs.ks, the local keystore. This is stored encrypted.
	*data.db, a small database for storing settings, user information and keychain versioning information.