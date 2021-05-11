using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;

namespace dotnet_demo.Controllers
{
    [ApiController]
    [Route("")]
    public class ApiController : ControllerBase
    {
        private readonly ILogger<ApiController> _logger;

        public ApiController(ILogger<ApiController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        [Route("/")]
        public string Get()
        {
            return "Hello world";
        }

        [Authorize]
        [HttpGet]
        [Route("/protected")]
        public string GetProtected()
        {
            return "Hello " + HttpContext.User.Identity.Name;
        }
    }
}
