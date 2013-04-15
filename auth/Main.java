import java.io.*;
import java.util.*;
import org.json.simple.JSONObject;
import org.json.simple.JSONArray;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException; 

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.PreparedStatement;


public class Main extends NanoHTTPD {
	
	Hashtable pubKeys = new Hashtable();
	//private static Connection connection = null;
		
	public Main (String [] s) throws IOException {
	
		super(8080, new File("."));
		
		System.out.println( "STARTING THE SERVER" );
		
	}

	public Response serve( String uri, String method, Properties header, Properties parms, Properties files )
	{	
		Connection connection = null;
		try {
			
			Class.forName("org.sqlite.JDBC");
			
		}catch(ClassNotFoundException e){
			System.err.println(e.getMessage());
		}
		String type, id, key;
		String response = "invalid";
		JSONObject msg = new JSONObject();
		JSONObject val = new JSONObject();		
		System.out.println(parms.toString());
		//parms.replaceAll("&", "&amp;");
		if(parms != null && !parms.isEmpty()){
			try{
				connection = DriverManager.getConnection("jdbc:sqlite:/Users/david/Documents/facebookWall/auth/sample.db");
				Statement stmt = connection.createStatement();
				stmt.setQueryTimeout(30);
			
				try{	
					JSONParser parser = new JSONParser();
  					Object obj=parser.parse(parms.toString());
	  				val=(JSONObject)obj;		
				}catch(ParseException pe){
					System.out.println(pe);
				}
				
				System.out.println(val.get("type"));
				
				type = (String)val.get("type");
		
				if(type.equals("requestKey")){
				
					id = (String)val.get("id");
					/*ResultSet rs = stmt.executeQuery("select * from users where id=" + id);
					while(rs.next()){
						System.out.println("key = " + rs.getString("publicKey"));
					}*/
					//if(pubKeys.containsValue(id)){
					String query = "select * from users where id=" + id;
					ResultSet rs = stmt.executeQuery(query);
					while (rs.next()) {
						System.out.println("key = " + rs.getString("publicKey"));
						response = rs.getString("publicKey");
					}
						//response = (String)pubKeys.get(id);
						/*}else{
						response = "User has no key";
						}*/
			
				}else if(type.equals("init")){
					
					id = (String)val.get("id");
					key = ((String)val.get("pubKey")).replaceAll(" ", "+");;
					
					pubKeys.put(id, key);
					PreparedStatement updateUser = null;
					String updateString = "insert into users values(?, ?)";
					updateUser = connection.prepareStatement(updateString);
					updateUser.setString(1, id);
					updateUser.setString(2, key);
					updateUser.executeUpdate();
					connection.commit();
					//stmt.executeUpdate("insert into users values(" + id + ", " + key + ")");
					response = "initialised";			
					
					System.out.println("User initialised");
					System.out.println(id + ": " + key);			
					
				}else{response = "invalid request";}
			}catch(SQLException e){
					System.err.println(e.getMessage());
			}finally{
				try {
					if(connection != null)
						connection.close();
				}catch(SQLException e){
					// connection close failed.
					System.err.println(e);
				}
			}
		}else{response = "invalid fields";}
		/*msg = "{" +
					"'response': " + chat.multisentenceRespond(input) 
			   + "}";*/
		msg.put("response", response);
		
		return new NanoHTTPD.Response( HTTP_OK, MIME_HTML, msg.toString() );
	}
	
	public static void main(String args[]) {
		
		try {
			new Main(args);
		} catch ( IOException ioe ) {
			System.err.println( "Couldn't start server:\n" + ioe );
			System.exit( -1 );
		}
		System.out.println( "Listening on port 8080. Hit Enter to stop.\n" );
		try { System.in.read(); } catch( Throwable t ) {};
		
	}
	
}
