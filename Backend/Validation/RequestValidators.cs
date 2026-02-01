using Backend.Contracts;
using FluentValidation;

namespace Backend.Validation;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.InviteCode).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
        RuleFor(x => x.ZulipEmail).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.ZulipToken).NotEmpty().MinimumLength(10).MaximumLength(256);
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public class UpdateZulipTokenRequestValidator : AbstractValidator<UpdateZulipTokenRequest>
{
    public UpdateZulipTokenRequestValidator()
    {
        RuleFor(x => x.ZulipEmail).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.ZulipToken).NotEmpty().MinimumLength(10).MaximumLength(256);
    }
}

public class SendMessageRequestValidator : AbstractValidator<SendMessageRequest>
{
    public SendMessageRequestValidator()
    {
        RuleFor(x => x.StreamId).GreaterThan(0);
        RuleFor(x => x.Topic).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);
    }
}

public class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().MinimumLength(32);
    }
}
