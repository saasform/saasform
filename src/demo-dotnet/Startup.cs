using System;
using System.Text;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
//using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace dotnet_demo
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();

            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options => {
                options.Events = new CookieAuthenticationEvents
                {
                    OnRedirectToLogin = context =>
                    {
                        var keys = context.HttpContext.Request.Cookies.Keys;
                        if (!keys.Contains("__session"))
                        {
                            var SAASFORM_LOGIN_URL = Environment.GetEnvironmentVariable("SAASFORM_LOGIN_URL");

                        
                            context.HttpContext.Response.Redirect(SAASFORM_LOGIN_URL);
                            return Task.FromResult(true);
                        }
                        else {
                        
                        string CookieValue = context.HttpContext.Request.Cookies["__session"];
                        
                        var Handler = new JwtSecurityTokenHandler();
                        var Token = Handler.ReadJwtToken(CookieValue);

                        try
                            {
                                var validateParameters = new TokenValidationParameters()
                                {
                                    ValidateLifetime = false,
                                    ValidateAudience = false,
                                    ValidateIssuer = false,
                                    ValidIssuer = "Sample",
                                    ValidAudience = "Sample",
                                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(CookieValue))
                                };
                                SecurityToken validatedToken;
                                Handler.ValidateToken(Token.ToString(), validateParameters, out validatedToken);

                                if (validatedToken is JwtSecurityToken jwtSecurityToken)
                                {
                                    var result = jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase);
                                    if (result == false)
                                    {
                                        // Not valid token exception
                                        throw new Exception();
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                // Full list of exceptions during validation 
                                // https://docs.microsoft.com/en-us/dotnet/api/system.identitymodel.tokens.jwt.jwtsecuritytokenhandler.validatetoken?view=azure-dotnet
                                Console.WriteLine(ex.Message);
                            }
    
                        var UserName = Token.Claims.Where(c => c.Type == "account_name").FirstOrDefault().Value;
                        var UserClaims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, UserName),
                            new Claim(ClaimTypes.Name, UserName)
                        };
                        var UserIdentity = new ClaimsIdentity(UserClaims, CookieAuthenticationDefaults.AuthenticationScheme);
                        var UserPrincipal = new ClaimsPrincipal(UserIdentity);
                        context.HttpContext.SignInAsync(UserPrincipal);

                        return Task.FromResult(true);
                        }
                    }
                };
            });

        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseCookiePolicy();

            app.UseAuthentication();

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
