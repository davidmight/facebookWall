#include "pkg.h"

Miracl precision(16,0);

Big secret;
Big PrimeP;
Big PrimeQ;
Big PointX;
Big PointY;
Big PointPubX;
Big PointPubY;
Big CubeRootX;
Big CubeRootY;

pkg::pkg(){
	
}

void pkg :: ibe_getParams(char **ret){

}

void pkg :: ibe_setup(){

    ECn P,Ppub;
    ZZn2 cube;
    Big s,p,q,t,n,cof,x,y;
    long seed;
    miracl *mip=&precision;
	
	seed = rand() % 800000000 + 100000000;
    irand(seed);
	
	//SET-UP
	
    q=pow((Big)2,159)+pow((Big)2,17)+1;
	
	// generate p 
    t=(pow((Big)2,PBITS)-1)/(2*q);
    s=(pow((Big)2,PBITS-1)-1)/(2*q);
    forever {
        n=rand(t);
        if (n<s) continue;
        p=2*n*q-1;
        if (p%24!=11) continue;  // must be 2 mod 3, also 3 mod 8
        if (prime(p)) break;
    }

    cof=2*n; 

    ecurve(0,1,p,MR_PROJECTIVE);    // elliptic curve y^2=x^3+1 mod p

	/*
	 * Find suitable cube root of unity (solution in Fp2 of x^3=1 mod p)
	 */    
    forever{
        cube=pow(randn2(),(p+1)/3);
        cube=pow(cube,p-1);
        if (!cube.isunity()) break;
    }

    if (!(cube*cube*cube).isunity()){
        cout << "sanity check failed" << endl;
        exit(0);
    }

	/*
	 * Choosing an arbitrary P ....
	 */
    forever{
        while (!P.set(randn())) ;
        P*=cof;
        if (!P.iszero()) break;
    }

	/*
	 * Pick a random master key s 
	 */    
    s=rand(q);
    Ppub=s*P;

	 secret = s;
	cout << "Secret s= " << secret << endl;
	PrimeP = p; PrimeQ = q;

	P.get(x, y);
	PointX = x; PointY = y;

	Ppub.get(x, y);
	PointPubX = x; PointPubY = y;
	cube.get(x, y);
	CubeRootX = x; CubeRootY = y;

}

void pkg :: ibe_extract(char *id, char *ret){
	
	//Miracl precision(16,0);
	miracl *mip=mirsys(16,0);     // thread-safe ready.  (32,0) for 1024 bit p
	ofstream private_key("private.ibe");
    ECn Qid,Did;
    Big p,q,cof,s,x,y;
    int bits;
	

    bits = PBITS;
    mip->IOBASE=16;
	p = PrimeP;
	q = PrimeQ;
    s = secret;
    mip->IOBASE=10;

    ecurve(0,1,p,MR_PROJECTIVE);
    cof=(p+1)/q;

	// EXTRACT

    Qid=map_to_point(id);
    Did=s*Qid;

    //cout << "Private key= " << Did << endl;

    Did.get(x,y);
    mip->IOBASE=16;
    ret << y;

	//cout << "Private: " << retVal << endl;

}

/*
 * Hash functions
 */ 
Big pkg :: H1(char *string){ 
	// Hash a zero-terminated string to a number < modulus
    Big h,p;
    char s[HASH_LEN];
    int i,j; 
    sha256 sh;

    shs256_init(&sh);

    for (i=0;;i++)
    {
        if (string[i]==0) break;
        shs256_process(&sh,string[i]);
    }
    shs256_hash(&sh,s);
    p=get_modulus();
    h=1; j=0; i=1;
    forever
    {
        h*=256; 
        if (j==HASH_LEN)  {h+=i++; j=0;}
        else         h+=s[j++];
        if (h>=p) break;
    }
    h%=p;
    return h;
}

/*
 * Given y, get x=(y^2-1)^(1/3) mod p (from curve equation)
 */
Big pkg :: getx(Big y){
    Big p=get_modulus();
    Big t=modmult(y+1,y-1,p);   // avoids overflow
    return pow(t,(2*p-1)/3,p);
}

/*
 * MapToPoint
 */
ECn pkg :: map_to_point(char *ID){
    ECn Q;
    Big x0,y0=H1(ID);
 
    x0=getx(y0);

    Q.set(x0,y0);

    return Q;
}