#ifndef IBE_ENCRYPTION_H
#define IBE_ENCRYPTION_H

#include "pkg.h"

class IBE_Encryptor {
	
	private:
		Big H1(char *string);
		Big getx(Big y);
		ECn map_to_point(char *ID);

		BOOL ecap(ECn& P,ECn& Q,Big& order,ZZn2& cube,ZZn2& res);
		void strip(char *name);
		int H2(ZZn2 x,char *s);
		Big H3(char *x1,char *x2);
		void H4(char *x,char *y);
		BOOL fast_tate_pairing(ECn& P,ZZn2& Qx,ZZn2& Qy,Big& q,ZZn2& res);
		void g(ECn& A,ECn& B,ZZn2& Qx,ZZn2& Qy,ZZn2& num);
		void extract(ECn& A,ZZn& x,ZZn& y);
		void extract(ECn& A,ZZn& x,ZZn& y,ZZn& z);
		ZZn2 line(ECn& A,ECn& C,ZZn& slope,ZZn2& Qx,ZZn2& Qy);
		ZZn2 vertical(ECn& A,ZZn2& Qx);

	public:
		void encrypt(char *result, char *recipient, char *input);

};

#endif