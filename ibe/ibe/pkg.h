#ifndef PKG_H
#define PKG_H

#include <iostream>
#include <fstream>
#include <cstring>
#include "big.h"
#include "ecn.h"
#include "zzn.h"
#include "zzn2.h"
#include "ebrick.h"
#include "ibe_encryption.h"
#include "ibe_decryption.h"

using namespace std;

//parameter size
#define PBITS 512
#define QBITS 160
#define HASH_LEN 32

class pkg {
	
	private:
		//params
		/*char secret[50];
		char PrimeP[50];
		char PrimeQ[50];
		char PointX[100];
		char PointY[100];
		char PointPubX[100];
		char PointPubY[100];
		char CubeRootX[200];
		char CubeRootY[200];*/

	public:
		pkg();
		void ibe_setup();
		void ibe_extract(char *id, char *ret);
		void ibe_getParams(char **ret);

		Big H1(char *string);
		Big getx(Big y);
		ECn map_to_point(char *ID);

};

#endif